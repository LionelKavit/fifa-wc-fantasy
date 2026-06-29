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
// to a chalk seed.
//
// The move set is BIDIRECTIONAL single-match flips PLUS composite "ride a dark horse"
// path moves: advance one underdog through several consecutive rounds at once. A dark
// horse only pays off when it wins EVERY round on its path together, so no single flip on
// that path raises win probability alone and a single-flip greedy can never start down
// it. The composite move applies the whole path as one unit, so the search can reach
// those coordinated brackets.
//
// The search itself is a BEAM of width W: it keeps the top-W candidate brackets and
// expands all of them each round (rather than a single hill-climb state), so it can hold
// a promising-but-currently-worse line and reach brackets a single-state greedy misses.
// W = 1 reduces exactly to the greedy hill-climb. Children are scored under common random
// numbers and MEMOIZED by canonical state key (the same bracket reached via different
// parents is evaluated once). The full-trials floor gate (best beam state vs. the seed)
// is unchanged, so the result is still never worse than the heuristic seed.

import type { TournamentSnapshot } from "../data/models";
import type { Prediction } from "./types";
import { buildBracket, type R32Projection } from "./bracket";
import { predictedParticipants } from "./prediction";
import { upsetMultiplier, UPSET_MULTIPLIER_CUTOFFS, type UpsetCutoffs } from "./predictionScore";
import { evaluatePoolFinish, type MatchupWinProb } from "./poolFinish";
import type { OutcomeModel } from "./outcome";
import type { StageWinProb } from "./bracketGenerator";
import { KO_LAYOUT } from "./bracketLayout";

const DEFAULT_SEARCH_TRIALS = 600;
const DEFAULT_FINAL_TRIALS = 4000;
const DEFAULT_MAX_FLIPS = 10;
const DEFAULT_CANDIDATE_CAP = 6;
const DEFAULT_EPSILON = 0.002; // min win-prob lift to commit a flip (avoid committing noise)
const DEFAULT_MAX_PATH_DEPTH = 5; // a dark horse advances at most R32 → Final (5 matches)
const DEFAULT_BEAM_WIDTH = 4; // candidate brackets kept in parallel (1 = greedy hill-climb)

/** Match → the match its winner feeds into (its parent), for walking a team's forward
 * path. Built from the static knockout layout; the final has no parent. */
const PARENT_MATCH: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>();
  for (const e of KO_LAYOUT) {
    m.set(`M${e.home}`, `M${e.match}`);
    m.set(`M${e.away}`, `M${e.match}`);
  }
  return m;
})();

/** Stable canonical key for a selected-set, for deduplicating composite moves. */
const selectedKey = (s: Set<string>): string => [...s].sort().join(",");

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
  /** Max upset-adding candidates scored per step (cost bound); also caps the number of
   * dark-horse starting points for composite path moves. */
  candidateCap?: number;
  /** Max rounds a composite "ride a dark horse" move advances an underdog (cost bound).
   * Set to 1 (or 0) to disable composite moves (single-flip search only). */
  maxPathDepth?: number;
  /** Beam width: candidate brackets kept in parallel each round. 1 = greedy hill-climb. */
  beamWidth?: number;
  /** Minimum win-probability lift required to commit a flip. */
  epsilon?: number;
  /** The scalar objective to MAXIMIZE: (prediction, trials) → value. Defaults to pool-win
   * probability via evaluatePoolFinish. The server supplies a pool-size-free risk-mode
   * objective (a score-distribution quantile) here instead; tests inject a synthetic one. */
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

/** Bidirectional single-flip move set: revert any current upset (remove) or add a
 * plausible new one. Each yields a trial selected-set with that one match toggled. */
function singleFlipMoves(
  bracket: ReturnType<typeof buildBracket>,
  current: Prediction,
  selected: Set<string>,
  opts: LeverageGenerateOptions,
): Set<string>[] {
  const ids = [...selected, ...addCandidates(bracket, current, selected, opts)];
  return ids.map((id) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    return s;
  });
}

/** Composite "ride a dark horse" moves: for each plausible-underdog starting match, take
 * its underdog and advance it through up to `maxPathDepth` consecutive rounds at once.
 * Each move forces that team to win every match on its forward path (selecting where it is
 * the underdog, deselecting where it is the favorite), so a coordinated multi-round upset
 * is reachable in a single step. Emits one move per path length ≥ 2 (depth-1 == a single
 * flip, already covered), deduplicated by canonical key. */
function pathMoves(
  bracket: ReturnType<typeof buildBracket>,
  current: Prediction,
  selected: Set<string>,
  opts: LeverageGenerateOptions,
): Set<string>[] {
  const maxDepth = opts.maxPathDepth ?? DEFAULT_MAX_PATH_DEPTH;
  if (maxDepth < 2) return [];
  const moves: Set<string>[] = [];
  const seen = new Set<string>();
  for (const startId of addCandidates(bracket, current, selected, opts)) {
    const [a0, b0] = predictedParticipants(bracket, current, startId);
    if (a0 === null || b0 === null) continue;
    const horse = opts.matchupWinProb(a0, b0) >= 0.5 ? b0 : a0; // the underdog at the start
    const s = new Set(selected);
    let matchId: string | undefined = startId;
    let forced = 0;
    while (matchId && forced < maxDepth) {
      const pred = buildFromSelected(bracket, s, opts.matchupWinProb);
      const [a, b] = predictedParticipants(bracket, pred, matchId);
      if (a === null || b === null || (a !== horse && b !== horse)) break;
      const fav = opts.matchupWinProb(a, b) >= 0.5 ? a : b;
      if (horse === fav) s.delete(matchId); // already favored here → don't spend an upset
      else s.add(matchId); // underdog here → select to take the horse
      forced++;
      matchId = PARENT_MATCH.get(matchId);
      if (forced >= 2) {
        const key = selectedKey(s);
        if (!seen.has(key)) {
          seen.add(key);
          moves.push(new Set(s));
        }
      }
    }
  }
  return moves;
}

/** Full per-step move set: single-match flips (both directions) plus composite path moves. */
function candidateMoves(
  bracket: ReturnType<typeof buildBracket>,
  current: Prediction,
  selected: Set<string>,
  opts: LeverageGenerateOptions,
): Set<string>[] {
  return [...singleFlipMoves(bracket, current, selected, opts), ...pathMoves(bracket, current, selected, opts)];
}

/** A bracket reached by the search, identified by its canonical selected-set key and its
 * estimated win probability at the search trial count. */
interface BeamState {
  selected: Set<string>;
  key: string;
  win: number;
}

/**
 * Generate a complete, feasible bracket that maximizes pool-win probability by a beam
 * search (width `beamWidth`; 1 = greedy hill-climb) over single-flip + composite path
 * moves, seeded from `start` (the heuristic bracket; chalk if omitted). The result is
 * never worse than the seed (a full-trials floor gate). Deterministic given the seed; a
 * new seed can yield a different optimum via a different sampled field.
 */
export function generateByLeverage(snapshot: TournamentSnapshot, opts: LeverageGenerateOptions): LeverageResult {
  const bracket = buildBracket(snapshot, { projection: opts.projection });
  const searchTrials = opts.searchTrials ?? DEFAULT_SEARCH_TRIALS;
  const maxRounds = opts.maxFlips ?? DEFAULT_MAX_FLIPS;
  const epsilon = opts.epsilon ?? DEFAULT_EPSILON;
  const beamWidth = Math.max(1, opts.beamWidth ?? DEFAULT_BEAM_WIDTH);
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

  // Memoize search-trial scores by canonical key: the same bracket reached via different
  // parents (or rounds) is evaluated only once.
  const scoreCache = new Map<string, number>();
  const mkState = (selected: Set<string>): BeamState => {
    const key = selectedKey(selected);
    let win = scoreCache.get(key);
    if (win === undefined) {
      win = evalWin(buildFromSelected(bracket, selected, opts.matchupWinProb), searchTrials);
      scoreCache.set(key, win);
    }
    return { selected, key, win };
  };

  // Higher win first; ties broken by a stable total order on the key (determinism).
  const byWinThenKey = (a: BeamState, b: BeamState): number =>
    b.win - a.win || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  const dedupTopW = (states: BeamState[]): BeamState[] => {
    const seen = new Set<string>();
    const uniq: BeamState[] = [];
    for (const s of [...states].sort(byWinThenKey)) {
      if (!seen.has(s.key)) {
        seen.add(s.key);
        uniq.push(s);
      }
    }
    return uniq.slice(0, beamWidth);
  };

  // Initial beam: the heuristic seed, plus chalk when W > 1 (W = 1 starts at the seed so
  // it reduces exactly to the hill-climb; chalk stays reachable via reverts + the floor).
  const seedSelected = selectedFromStart(bracket, opts);
  const seedState = mkState(seedSelected);
  const initial: BeamState[] = [seedState];
  if (beamWidth > 1 && seedSelected.size > 0) initial.push(mkState(new Set()));

  let beam = dedupTopW(initial);
  let best = beam[0]!; // highest-win state seen so far (the beam is sorted)

  // `maxRounds` (= maxFlips) bounds the number of expansion rounds.
  for (let round = 0; round < maxRounds; round++) {
    const children: BeamState[] = [];
    for (const member of beam) {
      const memberPred = buildFromSelected(bracket, member.selected, opts.matchupWinProb);
      for (const move of candidateMoves(bracket, memberPred, member.selected, opts)) {
        children.push(mkState(move));
      }
    }
    beam = dedupTopW([...beam, ...children]);
    const roundBest = beam[0]!;
    if (roundBest.win > best.win + epsilon) best = roundBest;
    else break; // no candidate improved the best by more than epsilon
  }

  // Enforce the floor at the REPORTED resolution. The search scores on a reduced trial
  // count and can overfit that sample (a bracket that wins at search trials may not hold
  // at full trials, especially in large pools where true gains are below the low-trial
  // noise floor). Re-evaluate the best beam state and the seed at full trials and keep
  // whichever is actually better (seed wins ties) — so "never worse than the seed" holds
  // at the trial count the verdict/UI reports.
  const finalTrials = opts.finalTrials ?? DEFAULT_FINAL_TRIALS;
  const seedPred = buildFromSelected(bracket, seedSelected, opts.matchupWinProb);
  const bestPred = best.key === seedState.key ? seedPred : buildFromSelected(bracket, best.selected, opts.matchupWinProb);
  const bestFinal = evalWin(bestPred, finalTrials);
  if (best.key !== seedState.key) {
    const seedFinal = evalWin(seedPred, finalTrials);
    if (seedFinal >= bestFinal) return { prediction: seedPred, winProbability: seedFinal };
  }
  return { prediction: bestPred, winProbability: bestFinal };
}
