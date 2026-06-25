// Best-eight-of-twelve third-placed team selection under FIFA criteria.
// Pure and reusable: invoked both for a concrete scenario and inside every
// Monte Carlo trial.

import type { StandingRow } from "./types";

/** Rank third-placed teams: points → goal difference → goals scored → (fair play,
 * unavailable in the feed) → drawing of lots (ascending team id). */
function compareThird(a: StandingRow, b: StandingRow): number {
  if (a.points !== b.points) return b.points - a.points;
  if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
  if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
  return a.teamId - b.teamId; // deterministic lots
}

export interface ThirdPlaceResult {
  /** Team ids that qualify (up to 8), best first. */
  qualified: number[];
  /** Team ids that miss out, in rank order. */
  notQualified: number[];
  /** All input teams in ranked order. */
  ranked: number[];
}

/**
 * Given the third-placed team from each group, select the best 8 to advance.
 * Deterministic for identical input.
 */
export function rankThirdPlaced(rows: StandingRow[], slots = 8): ThirdPlaceResult {
  const sorted = [...rows].sort(compareThird);
  const ranked = sorted.map((r) => r.teamId);
  return {
    qualified: ranked.slice(0, slots),
    notQualified: ranked.slice(slots),
    ranked,
  };
}
