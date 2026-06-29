// Server-only predictor data: the knockout bracket + baseline odds (for rendering
// and per-pick probabilities) and a prediction evaluator (scoring + model
// comparison). The bracket/odds are cached per snapshot so the Monte Carlo does
// not run on every request; evaluation runs the simulation for a specific
// prediction and is kept to a modest trial count for interactive latency.

import { getTournamentData } from "./tournament";
import { buildOutcomeModel, STRENGTHS, TEAM_ELO } from "./model";
import { resolveTeam, type BracketContext } from "../scout";
import { loadKnowledge } from "./knowledge";
import {
  buildBracket,
  projectR32,
  knockoutProbabilities,
  isPredictionLocked,
  scorePrediction,
  compareToModel,
  predictedParticipants,
  generateBracket,
  generateByLeverage,
  poissonHeadToHead,
  type RiskLevel,
  type KnockoutTeamOdds,
  type Bracket,
  type FinishProbs,
  type KnockoutStage,
  type Prediction,
  type AdvancementReport,
} from "../engine";

/** Modest trial count for the interactive path — balances latency vs. noise. */
const PREDICTOR_TRIALS = 20_000;
const SEED = 1;
/** A Round-of-32 match is flagged an upset watch when the favourite's win
 * probability is at or below this. */
const UPSET_THRESHOLD = 0.6;

/** P(a beats b) from the single Poisson head-to-head model (neutral), matching the
 * simulation; 50/50 when a strength is unknown. Drives the card, the upset multiplier,
 * the generator, and the opponent-field chalk bias. */
function headToHead(a: number, b: number): number {
  const sa = STRENGTHS.get(a);
  const sb = STRENGTHS.get(b);
  if (sa === undefined || sb === undefined) return 0.5;
  return poissonHeadToHead(sa, sb);
}

interface UITeam {
  teamId: number;
  abbr: string;
  name: string;
}
interface UISlot {
  label: string;
  team: UITeam | null;
  /** True when `team` is a model projection (fallback before the real R32 is set). */
  projected?: boolean;
  /** For later rounds, the match whose winner feeds this slot. */
  fromMatch?: string;
  /** Model win probability for this participant (Round of 32 only, when known). */
  winProb?: number;
}
interface UIMatch {
  id: string;
  matchNumber: number;
  stage: KnockoutStage;
  slots: [UISlot, UISlot];
  winner: UITeam | null;
  /** True when the Round-of-32 favourite's edge is slim (upset watch). */
  upset?: boolean;
}
export interface BracketData {
  fetchedAt: string;
  locked: boolean;
  /** True when any R32 slot is a model projection (fallback before the real draw). */
  projected: boolean;
  matches: UIMatch[];
  /** teamId → model probability of winning the tournament (for display). */
  championOdds: Record<number, number>;
}

let cache: { key: string; data: BracketData } | null = null;

/** Build the R32 projection from the cached advancement report's finishing-position probabilities. */
function buildProjection(snapshot: Parameters<typeof projectR32>[0], report: AdvancementReport) {
  const finish: FinishProbs = new Map(report.teams.map((t) => [t.teamId, t.finish]));
  return projectR32(snapshot, finish);
}

function serialize(bracket: Bracket): UIMatch[] {
  return bracket.matches.map((m) => {
    const slots = m.slots.map((s) => {
      const slot: UISlot = {
        label: s.label,
        team: s.team ? { teamId: s.team.teamId, abbr: s.team.abbr, name: s.team.name } : null,
      };
      if (s.projected) slot.projected = true;
      if (s.feeder.kind === "matchWinner") slot.fromMatch = s.feeder.matchId;
      return slot;
    }) as [UISlot, UISlot];

    let upset = false;
    if (m.stage === "R32" && slots[0].team && slots[1].team) {
      // Poisson head-to-head — the single source the Analyst, scoring, and sim share.
      const p0 = headToHead(slots[0].team.teamId, slots[1].team.teamId);
      slots[0].winProb = p0;
      slots[1].winProb = 1 - p0;
      upset = Math.max(p0, 1 - p0) <= UPSET_THRESHOLD;
    }

    return {
      id: m.id,
      matchNumber: m.matchNumber,
      stage: m.stage,
      slots,
      winner: m.winner ? { teamId: m.winner.teamId, abbr: m.winner.abbr, name: m.winner.name } : null,
      upset,
    };
  });
}

/** The current bracket + baseline odds, cached per snapshot. */
export async function getBracketData(): Promise<BracketData> {
  const { snapshot, report } = await getTournamentData();
  if (cache && cache.key === snapshot.fetchedAt) return cache.data;

  const projection = buildProjection(snapshot, report);
  const bracket = buildBracket(snapshot, { projection });
  const odds = knockoutProbabilities(snapshot, { trials: PREDICTOR_TRIALS, seed: SEED, model: buildOutcomeModel(snapshot) });
  const championOdds: Record<number, number> = {};
  for (const t of odds.teams) championOdds[t.teamId] = t.champion;

  const matches = serialize(bracket);
  const data: BracketData = {
    fetchedAt: snapshot.fetchedAt,
    locked: isPredictionLocked(snapshot),
    projected: matches.some((m) => m.stage === "R32" && m.slots.some((s) => s.projected)),
    matches,
    championOdds,
  };
  cache = { key: snapshot.fetchedAt, data };
  return data;
}

export interface EvaluationResult {
  score: ReturnType<typeof scorePrediction>;
  comparison: ReturnType<typeof compareToModel>;
}

/** Validate `picks` against the current bracket, then score + compare to the model. */
export async function evaluatePrediction(picks: [string, number][]): Promise<EvaluationResult> {
  const { snapshot, report } = await getTournamentData();
  const projection = buildProjection(snapshot, report);
  const bracket = buildBracket(snapshot, { projection });
  const valid = new Map(bracket.matches.map((m) => [m.id, m]));

  // Apply picks in bracket order so a later-round pick is validated against the
  // participants its (already-applied) feeder picks imply.
  const ordered = [...picks].sort((x, y) => (valid.get(x[0])?.matchNumber ?? 0) - (valid.get(y[0])?.matchNumber ?? 0));
  const prediction: Prediction = new Map();
  for (const [matchId, teamId] of ordered) {
    if (!valid.has(matchId)) throw new Error(`Unknown match "${matchId}"`);
    const [a, b] = predictedParticipants(bracket, prediction, matchId);
    if (teamId !== a && teamId !== b) throw new Error(`Invalid pick for ${matchId}: team ${teamId} is not a participant`);
    prediction.set(matchId, teamId);
  }

  // Head-to-head win probability for the picked team vs. the opponent the prediction
  // implies — drives the upset multiplier. An undetermined opponent is a toss-up.
  const matchupWinProb = (pickedTeamId: number, opponentTeamId: number | null): number =>
    opponentTeamId === null ? 0.5 : headToHead(pickedTeamId, opponentTeamId);

  return {
    score: scorePrediction(snapshot, prediction, { projection, matchupWinProb }),
    comparison: compareToModel(snapshot, prediction, {
      trials: PREDICTOR_TRIALS,
      seed: SEED,
      projection,
      model: buildOutcomeModel(snapshot),
    }),
  };
}

/** Generate a complete, grounded bracket calibrated to risk + pool size, as
 * `[matchId, teamId]` pairs ready to populate the predictor. */
// Per-team deep-run odds, cached per snapshot — the plausibility input for the generator
// (marginal reach-and-win probabilities). Same Monte Carlo as the bracket data.
let oddsCache: { key: string; byTeam: Map<number, KnockoutTeamOdds> } | null = null;
function knockoutOddsByTeam(snapshot: Parameters<typeof projectR32>[0] & { fetchedAt: string }): Map<number, KnockoutTeamOdds> {
  if (oddsCache && oddsCache.key === snapshot.fetchedAt) return oddsCache.byTeam;
  const odds = knockoutProbabilities(snapshot, { trials: PREDICTOR_TRIALS, seed: SEED, model: buildOutcomeModel(snapshot) });
  const byTeam = new Map(odds.teams.map((t) => [t.teamId, t]));
  oddsCache = { key: snapshot.fetchedAt, byTeam };
  return byTeam;
}

export type GenerationStrategy = "heuristic" | "leverage";

/** Safety cap on beam search rounds (it auto-stops earlier). A beam needs far fewer
 * rounds than a hill-climb: it explores W lines per round and composite path moves advance
 * a dark horse several rounds in a single move. */
const LEVERAGE_MAX_FLIPS: Record<RiskLevel, number> = { safe: 3, balanced: 4, bold: 5 };

/** Beam width per risk — wider beams explore more contrarian lines (and cost more). */
const LEVERAGE_BEAM_WIDTH: Record<RiskLevel, number> = { safe: 2, balanced: 2, bold: 3 };

/** Reduced trial count for the beam's many candidate evaluations (CRN keeps rankings
 * stable at low trials; the final full-trials gate gives the honest reported number). The
 * per-evaluation cost scales with pool size, so the search stays light. */
const LEVERAGE_SEARCH_TRIALS = 150;

export async function generatePrediction(
  poolSize: number,
  risk: RiskLevel,
  seed?: number,
  strategy: GenerationStrategy = "heuristic",
  picks?: [string, number][],
): Promise<[string, number][]> {
  const { snapshot, report } = await getTournamentData();
  const projection = buildProjection(snapshot, report);

  // Already-made picks to keep: complete the bracket from the current state (fill the gaps).
  const locked = picks && picks.length ? new Map(picks) : undefined;

  // Marginal probability a team wins a match at each stage (≡ reaching the next stage).
  const oddsByTeam = knockoutOddsByTeam(snapshot);
  const stageWinProb = (teamId: number, stage: KnockoutStage): number => {
    const o = oddsByTeam.get(teamId);
    if (!o) return 0;
    return stage === "R32" ? o.reachR16 : stage === "R16" ? o.reachQF : stage === "QF" ? o.reachSF : stage === "SF" ? o.reachFinal : o.champion;
  };

  // Resolve any expert favor/fade signals (team names) to ids; unknown names are ignored.
  const { signals } = loadKnowledge();
  const toIds = (names: string[]): Set<number> => {
    const ids = new Set<number>();
    for (const name of names) {
      const t = resolveTeam(snapshot, name);
      if (t) ids.add(t.teamId);
    }
    return ids;
  };

  // The fast heuristic bracket — the default result, and the seed the leverage search
  // refines. Completes from any already-made picks (keeps them, fills the gaps).
  const heuristic = generateBracket(snapshot, {
    poolSize,
    risk,
    seed,
    matchupWinProb: headToHead,
    stageWinProb,
    projection,
    favor: toIds(signals.favor),
    fade: toIds(signals.fade),
    locked,
  });

  if (strategy === "leverage") {
    // Maximize pool-win probability directly (slower; opt-in). A beam search seeded from
    // the heuristic bracket, over single-flip + composite path moves; reuses the Poisson
    // head-to-head, reach odds, and the outcome model via evaluatePoolFinish.
    const { prediction } = generateByLeverage(snapshot, {
      poolSize,
      matchupWinProb: headToHead,
      model: buildOutcomeModel(snapshot),
      stageWinProb,
      projection,
      seed,
      maxFlips: LEVERAGE_MAX_FLIPS[risk],
      beamWidth: LEVERAGE_BEAM_WIDTH[risk],
      searchTrials: LEVERAGE_SEARCH_TRIALS,
      start: heuristic,
    });
    return [...prediction.entries()];
  }

  return [...heuristic.entries()];
}

/**
 * Build the bracket context the unified Scout needs for bracket/tracker questions.
 * Picks are passed through leniently (the tools tolerate odd picks); champion odds
 * are only attached when picks are present (they come from the cached bracket data).
 */
export async function buildScoutBracket(
  picks: [string, number][] | null,
  poolSize: number | null,
): Promise<BracketContext> {
  const { snapshot, report } = await getTournamentData();
  const ctx: BracketContext = {
    poolSize,
    model: buildOutcomeModel(snapshot),
    projection: buildProjection(snapshot, report),
    ratings: TEAM_ELO,
    strengths: STRENGTHS,
    matchupWinProb: headToHead,
    expertNotes: loadKnowledge().snippets,
  };
  if (picks && picks.length > 0) {
    ctx.prediction = new Map(picks);
    ctx.championOdds = (await getBracketData()).championOdds;
  }
  return ctx;
}

/** Test seam: clear the bracket cache. */
export function __resetBracketCacheForTests(): void {
  cache = null;
}
