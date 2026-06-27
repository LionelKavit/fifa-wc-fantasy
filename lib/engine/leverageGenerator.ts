// Leverage-driven bracket generation: build the bracket that maximizes the user's
// pool-win probability, by a greedy BIDIRECTIONAL local search that flips the match
// that most raises it. Each candidate is scored with evaluatePoolFinish under COMMON
// RANDOM NUMBERS (a fixed seed → identical outcomes + field), so the deltas are
// comparable at a low trial count. The slowest generation path — opt-in, with cost
// bounds — kept separate from the fast heuristic generator.
//
// The search is SEEDED from a starting bracket (`start`, the heuristic bracket) rather
// than from chalk. A single flip from chalk cannot assemble the *coordinated* upsets a
// large pool needs (no one upset alone raises win probability), so a chalk-seeded greedy
// gets stuck at a chalk local optimum and underperforms the heuristic in big pools.
// Seeding from the heuristic — which already places coherent upset paths — and allowing
// flips in BOTH directions (take an underdog, or revert one) means the result is never
// worse than the heuristic seed (it starts there and only commits strictly-better
// moves) and chalk stays reachable (revert every upset). With no `start`, it falls back
// to a chalk seed. A deeper global search (beam / path-aware multi-flip moves) is a
// deferred follow-up.

import type { TournamentSnapshot } from "../data/models";
import type { Prediction } from "./types";
import { buildBracket, type R32Projection } from "./bracket";
import { predictedParticipants } from "./prediction";
import { upsetMultiplier, UPSET_MULTIPLIER_CUTOFFS, type UpsetCutoffs } from "./predictionScore";
import { evaluatePoolFinish, type MatchupWinProb } from "./poolFinish";
import type { OutcomeModel } from "./outcome";
import type { StageWinProb } from "./bracketGenerator";

const DEFAULT_SEARCH_TRIALS = 600;
const DEFAULT_FINAL_TRIALS = 4000;
const DEFAULT_MAX_FLIPS = 10;
const DEFAULT_CANDIDATE_CAP = 6;
const DEFAULT_EPSILON = 0.002; // min win-prob lift to commit a flip (avoid committing noise)

export interface LeverageGenerateOptions {
  matchupWinProb: MatchupWinProb;
  model: OutcomeModel;
  poolSize: number;
  projection?: R32Projection;
  /** For candidate ranking/pruning (plausibility); optional. */
  stageWinProb?: StageWinProb;
  cutoffs?: UpsetCutoffs;
  seed?: number;
  gamma?: number;
  /** Starting bracket to seed and anchor the search (the heuristic bracket). The result
   * is never worse than this seed. Omit for a chalk seed. */
  start?: Prediction;
  /** Reduced trial count during the greedy search. */
  searchTrials?: number;
  /** Full trial count for the final evaluation. */
  finalTrials?: number;
  /** Safety cap on greedy moves (the search auto-stops earlier when no flip helps). */
  maxFlips?: number;
  /** Max upset-adding candidates scored per step (cost bound). */
  candidateCap?: number;
  /** Minimum win-probability lift required to commit a flip. */
  epsilon?: number;
  /** Test seam: override the win-probability evaluator (prediction, trials) → win prob. */
  evaluateWinProb?: (prediction: Prediction, trials: number) => number;
}

export interface LeverageResult {
  prediction: Prediction;
  winProbability: number;
}

/** Build a complete, feasible prediction from a set of "upset" match ids: walk top-down,
 * taking the underdog at selected matches and the favorite elsewhere. */
function buildFromSelected(
  bracket: ReturnType<typeof buildBracket>,
  selected: Set<string>,
  matchupWinProb: MatchupWinProb,
): Prediction {
  const pred: Prediction = new Map();
  for (const m of bracket.matches) {
    const [a, b] = predictedParticipants(bracket, pred, m.id);
    if (a === null || b === null) continue;
    const pa = matchupWinProb(a, b);
    pred.set(m.id, selected.has(m.id) ? (pa >= 0.5 ? b : a) : pa >= 0.5 ? a : b);
  }
  return pred;
}

/** Derive the set of "upset" matches (the pick is the underdog of its participants) from
 * a starting bracket, so the search can be seeded and anchored to it. Empty set = chalk. */
function selectedFromStart(bracket: ReturnType<typeof buildBracket>, opts: LeverageGenerateOptions): Set<string> {
  const sel = new Set<string>();
  const start = opts.start;
  if (!start) return sel;
  for (const m of bracket.matches) {
    const [a, b] = predictedParticipants(bracket, start, m.id);
    if (a === null || b === null) continue;
    const pick = start.get(m.id);
    if (pick === undefined) continue;
    const fav = opts.matchupWinProb(a, b) >= 0.5 ? a : b;
    if (pick !== fav) sel.add(m.id); // the underdog was taken
  }
  return sel;
}

/** Plausible-underdog matches not already flipped, ranked by plausibility, capped — the
 * "add an upset" moves. */
function addCandidates(
  bracket: ReturnType<typeof buildBracket>,
  current: Prediction,
  selected: Set<string>,
  opts: LeverageGenerateOptions,
): string[] {
  const cutoffs = opts.cutoffs ?? UPSET_MULTIPLIER_CUTOFFS;
  const ranked: { id: string; rank: number }[] = [];
  for (const m of bracket.matches) {
    if (selected.has(m.id)) continue;
    const [a, b] = predictedParticipants(bracket, current, m.id);
    if (a === null || b === null) continue;
    const pa = opts.matchupWinProb(a, b);
    const pUnderdog = Math.min(pa, 1 - pa);
    if (upsetMultiplier(pUnderdog, cutoffs) < 2) continue; // real-underdog gate
    const underdog = pa >= 0.5 ? b : a;
    ranked.push({ id: m.id, rank: opts.stageWinProb ? opts.stageWinProb(underdog, m.stage) : pUnderdog });
  }
  ranked.sort((x, y) => y.rank - x.rank);
  return ranked.slice(0, opts.candidateCap ?? DEFAULT_CANDIDATE_CAP).map((c) => c.id);
}

/** Bidirectional move set: revert any current upset (remove) or add a plausible new one. */
function candidateToggles(
  bracket: ReturnType<typeof buildBracket>,
  current: Prediction,
  selected: Set<string>,
  opts: LeverageGenerateOptions,
): string[] {
  return [...selected, ...addCandidates(bracket, current, selected, opts)];
}

/**
 * Generate a complete, feasible bracket that maximizes pool-win probability by a greedy
 * bidirectional local search seeded from `start` (the heuristic bracket; chalk if
 * omitted). The result is never worse than the seed. Deterministic given the seed; a new
 * seed can yield a different optimum via a different sampled field.
 */
export function generateByLeverage(snapshot: TournamentSnapshot, opts: LeverageGenerateOptions): LeverageResult {
  const bracket = buildBracket(snapshot, { projection: opts.projection });
  const searchTrials = opts.searchTrials ?? DEFAULT_SEARCH_TRIALS;
  const maxFlips = opts.maxFlips ?? DEFAULT_MAX_FLIPS;
  const epsilon = opts.epsilon ?? DEFAULT_EPSILON;
  const seed = opts.seed ?? 1;

  // Win probability under common random numbers (fixed seed) at the given trial count.
  const evalWin =
    opts.evaluateWinProb ??
    ((pred: Prediction, trials: number): number => {
      const r = evaluatePoolFinish(snapshot, pred, {
        poolSize: opts.poolSize,
        matchupWinProb: opts.matchupWinProb,
        model: opts.model,
        projection: opts.projection,
        seed,
        trials,
        gamma: opts.gamma,
        cutoffs: opts.cutoffs,
      });
      return r.complete ? r.winProbability : 0;
    });

  // Seed and anchor the search at the starting bracket (heuristic) — or chalk if none.
  const selected = selectedFromStart(bracket, opts);
  const seedPred = buildFromSelected(bracket, selected, opts.matchupWinProb);
  let current = seedPred;
  let currentWin = evalWin(current, searchTrials);

  for (let step = 0; step < maxFlips; step++) {
    let bestId: string | null = null;
    let bestWin = currentWin;
    for (const id of candidateToggles(bracket, current, selected, opts)) {
      const trial = new Set(selected);
      if (trial.has(id)) trial.delete(id);
      else trial.add(id);
      const w = evalWin(buildFromSelected(bracket, trial, opts.matchupWinProb), searchTrials);
      if (w > bestWin + epsilon) {
        bestWin = w;
        bestId = id;
      }
    }
    if (bestId === null) break; // no flip raises win probability
    if (selected.has(bestId)) selected.delete(bestId);
    else selected.add(bestId);
    current = buildFromSelected(bracket, selected, opts.matchupWinProb);
    currentWin = bestWin;
  }

  // Enforce the floor at the REPORTED resolution. The greedy commits flips on a reduced
  // trial count and can overfit that particular sample, so a flip that helped at search
  // trials may not hold up at full trials (especially in large pools, where true gains
  // are below the low-trial noise floor). Re-evaluate both the chosen bracket and the
  // seed at full trials and keep whichever is actually better (seed wins ties) — so
  // "never worse than the seed" holds at the trial count the verdict/UI reports.
  const finalTrials = opts.finalTrials ?? DEFAULT_FINAL_TRIALS;
  const currentFinal = evalWin(current, finalTrials);
  if (current !== seedPred) {
    const seedFinal = evalWin(seedPred, finalTrials);
    if (seedFinal >= currentFinal) return { prediction: seedPred, winProbability: seedFinal };
  }
  return { prediction: current, winProbability: currentFinal };
}
