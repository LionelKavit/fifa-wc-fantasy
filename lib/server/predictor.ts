// Server-only predictor data: the knockout bracket + baseline odds (for rendering
// and per-pick probabilities) and a prediction evaluator (scoring + model
// comparison). The bracket/odds are cached per snapshot so the Monte Carlo does
// not run on every request; evaluation runs the simulation for a specific
// prediction and is kept to a modest trial count for interactive latency.

import { getTournamentData } from "./tournament";
import { buildOutcomeModel } from "./model";
import {
  buildBracket,
  projectR32,
  knockoutProbabilities,
  isPredictionLocked,
  scorePrediction,
  compareToModel,
  predictedParticipants,
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

function serialize(bracket: Bracket, odds: ReturnType<typeof knockoutProbabilities>): UIMatch[] {
  const winProbFor = (a: number, b: number, team: number): number | undefined => {
    const mc = odds.matchups.find(
      (m) => (m.aTeamId === a && m.bTeamId === b) || (m.aTeamId === b && m.bTeamId === a),
    );
    if (!mc) return undefined;
    return team === mc.aTeamId ? mc.aWinProb : mc.bWinProb;
  };
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
      const p0 = winProbFor(slots[0].team.teamId, slots[1].team.teamId, slots[0].team.teamId);
      const p1 = p0 === undefined ? undefined : 1 - p0;
      slots[0].winProb = p0;
      slots[1].winProb = p1;
      if (p0 !== undefined) upset = Math.max(p0, p1!) <= UPSET_THRESHOLD;
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

  const matches = serialize(bracket, odds);
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

  return {
    score: scorePrediction(snapshot, prediction, { projection }),
    comparison: compareToModel(snapshot, prediction, {
      trials: PREDICTOR_TRIALS,
      seed: SEED,
      projection,
      model: buildOutcomeModel(snapshot),
    }),
  };
}

/** Test seam: clear the bracket cache. */
export function __resetBracketCacheForTests(): void {
  cache = null;
}
