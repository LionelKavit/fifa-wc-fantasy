// Prediction scoring — grade a fan's picks against the actual results.
//
// Pure function over a prediction and a snapshot. The actual knockout bracket
// (winners + who really reached each match) is the single source of truth, so the
// distinction between a `wrong` pick (the team reached the match but lost) and a
// `busted` pick (the team never reached it) falls straight out of the bracket.

import type { TournamentSnapshot } from "../data/models";
import type { Prediction, PredictionScore, PickScore, PickStatus, StageWeights } from "./types";
import { buildBracket, type R32Projection } from "./bracket";

/** Default weights: doubling per round (pool-sized), so later rounds are worth
 * strictly more. A perfect bracket scores 800 base points (160 per round). */
export const DEFAULT_STAGE_WEIGHTS: StageWeights = { R32: 10, R16: 20, QF: 40, SF: 80, F: 160 };

export interface ScoreOptions {
  weights?: StageWeights;
  /** Model projection used to fill the R32 before the real teams are known, so
   * projected participants are recognized (real results always take precedence). */
  projection?: R32Projection;
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
    const weight = weights[m.stage];
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

    const pointsEarned = status === "correct" ? weight : 0;
    current += pointsEarned;
    if (status === "correct" || status === "pending") maxAchievable += weight;

    picks.push({ matchId, stage: m.stage, pickedTeamId: teamId, status, pointsEarned });
  }

  return { picks, current, maxAchievable };
}
