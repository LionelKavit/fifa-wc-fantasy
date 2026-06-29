// Prediction scoring — grade a fan's picks against the actual results.
//
// Pure function over a prediction and a snapshot. The actual knockout bracket
// (winners + who really reached each match) is the single source of truth, so the
// distinction between a `wrong` pick (the team reached the match but lost) and a
// `busted` pick (the team never reached it) falls straight out of the bracket.

import type { TournamentSnapshot } from "../data/models";
import type { Prediction, PredictionScore, PickScore, PickStatus, StageWeights } from "./types";
import { buildBracket, type R32Projection } from "./bracket";
import { predictedParticipants } from "./prediction";

/** Default base weights: doubling per round, so later rounds are worth strictly
 * more (Round of 32 = 1 up to Final = 16). Correct picks earn `base × multiplier`. */
export const DEFAULT_STAGE_WEIGHTS: StageWeights = { R32: 1, R16: 2, QF: 4, SF: 8, F: 16 };

/** Win-probability cutoffs for the upset multiplier bands. A picked team at or above
 * `upper` is a favorite/coin-flip (×1); at or above `lower` (and below `upper`) an
 * underdog (×2); below `lower` a big underdog (×3). */
export interface UpsetCutoffs {
  upper: number;
  lower: number;
}
export const UPSET_MULTIPLIER_CUTOFFS: UpsetCutoffs = { upper: 0.4, lower: 0.2 };

/** Map a picked team's matchup win probability to its upset multiplier. Lower bounds
 * are inclusive: exactly `upper` → ×1, exactly `lower` → ×2. */
export function upsetMultiplier(winProb: number, cutoffs: UpsetCutoffs = UPSET_MULTIPLIER_CUTOFFS): 1 | 2 | 3 {
  if (winProb >= cutoffs.upper) return 1;
  if (winProb >= cutoffs.lower) return 2;
  return 3;
}

export interface ScoreOptions {
  weights?: StageWeights;
  /** Model projection used to fill the R32 before the real teams are known, so
   * projected participants are recognized (real results always take precedence). */
  projection?: R32Projection;
  /** Win-probability band cutoffs for the upset multiplier. */
  cutoffs?: UpsetCutoffs;
  /** Pure lookup for the picked team's win probability vs. the opponent the
   * prediction implies it plays. When omitted, every pick scores at ×1. */
  matchupWinProb?: (pickedTeamId: number, opponentTeamId: number | null) => number;
}

/**
 * Score a prediction against the actual results in the snapshot. Returns a status
 * and points for every pick, plus the current and maximum-achievable totals.
 */
export function scorePrediction(
  snapshot: TournamentSnapshot,
  prediction: Prediction,
  opts: ScoreOptions = {},
): PredictionScore {
  const weights = opts.weights ?? DEFAULT_STAGE_WEIGHTS;
  const cutoffs = opts.cutoffs ?? UPSET_MULTIPLIER_CUTOFFS;
  const bracket = buildBracket(snapshot, { projection: opts.projection });
  const byId = new Map(bracket.matches.map((m) => [m.id, m]));

  // Teams that have lost a decided real knockout match are out of the tournament.
  const eliminated = new Set<number>();
  for (const m of bracket.matches) {
    if (!m.winner) continue;
    for (const s of m.slots) {
      if (s.team && s.team.teamId !== m.winner.teamId) eliminated.add(s.team.teamId);
    }
  }

  const picks: PickScore[] = [];
  let current = 0;
  let maxAchievable = 0;

  for (const [matchId, teamId] of prediction) {
    const m = byId.get(matchId);
    if (!m) continue; // pick references an unknown match — skip
    const roundBase = weights[m.stage];
    const realWinner = m.winner?.teamId ?? null;
    const realParticipants = m.slots.map((s) => (s.team ? s.team.teamId : null));

    let status: PickStatus;
    if (realWinner !== null) {
      status = teamId === realWinner ? "correct" : realParticipants.includes(teamId) ? "wrong" : "busted";
    } else if (eliminated.has(teamId)) {
      status = "busted";
    } else {
      status = "pending";
    }

    // Upset multiplier from the picked team's win probability vs. the opponent the
    // prediction implies it plays. Without a probability source, every pick is ×1.
    let winProb: number | undefined;
    let multiplier: 1 | 2 | 3 = 1;
    if (opts.matchupWinProb) {
      const [a, b] = predictedParticipants(bracket, prediction, matchId);
      const opponent = teamId === a ? b : teamId === b ? a : null;
      winProb = opts.matchupWinProb(teamId, opponent);
      multiplier = upsetMultiplier(winProb, cutoffs);
    }

    const potential = roundBase * multiplier;
    const pointsEarned = status === "correct" ? potential : 0;
    current += pointsEarned;
    if (status === "correct" || status === "pending") maxAchievable += potential;

    picks.push({ matchId, stage: m.stage, pickedTeamId: teamId, status, roundBase, winProb, multiplier, pointsEarned });
  }

  return { picks, current, maxAchievable };
}
