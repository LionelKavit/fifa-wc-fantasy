// Enumeration of remaining-group-fixture outcomes for exact verdict classification.
//
// Top-2 qualification is monotonic in a team's own goal difference, so rather than
// enumerate unbounded scorelines we enumerate scorelines over a *saturating* margin
// range: a margin large enough to overcome any current goal-difference gap, beyond
// which a larger margin can no longer change the ordering. For the decisive final
// round (≤2 remaining fixtures per group) this is exhaustive and exact. For earlier
// rounds with more remaining fixtures we fall back to a bounded representative set
// (boundary margins) to keep the combination count tractable.

import type { TournamentSnapshot, GroupId, Team } from "../data/models";
import type { MatchResult } from "./standings";
import { buildOrderedRows } from "./standings";

export interface RemainingMatch {
  fixtureId: number;
  homeId: number;
  awayId: number;
  /** True if the match is in progress. */
  live: boolean;
  /** Current scoreline when live (0 otherwise). */
  liveHomeScore: number;
  liveAwayScore: number;
}

export interface GroupScenarioInputs {
  completed: MatchResult[];
  remaining: RemainingMatch[];
}

/** Split a group's fixtures into completed match results and remaining matches.
 * Live (in-progress) fixtures count as remaining — their final result is still
 * uncertain. */
export function splitGroupFixtures(snapshot: TournamentSnapshot, groupId: GroupId): GroupScenarioInputs {
  const group = snapshot.groups.find((g) => g.id === groupId);
  if (!group) throw new Error(`Unknown group "${groupId}"`);
  const ids = new Set(group.teams.map((t) => t.id));
  const completed: MatchResult[] = [];
  const remaining: RemainingMatch[] = [];
  for (const f of snapshot.fixtures) {
    if (f.stage !== "GROUP") continue;
    if (!ids.has(f.homeTeamId) || !ids.has(f.awayTeamId)) continue;
    if (f.status === "complete" && f.homeScore !== null && f.awayScore !== null) {
      completed.push({ homeId: f.homeTeamId, awayId: f.awayTeamId, homeGoals: f.homeScore, awayGoals: f.awayScore });
    } else {
      const live = f.status === "live";
      remaining.push({
        fixtureId: f.id,
        homeId: f.homeTeamId,
        awayId: f.awayTeamId,
        live,
        liveHomeScore: live ? (f.homeScore ?? 0) : 0,
        liveAwayScore: live ? (f.awayScore ?? 0) : 0,
      });
    }
  }
  return { completed, remaining };
}

/** A saturating margin bound: larger than any current goal-difference gap, so no
 * bigger margin can flip the ordering. Clamped to keep enumeration small. */
export function saturatingMargin(completed: MatchResult[], teams: Team[]): number {
  const rows = buildOrderedRows(teams, completed);
  const maxAbsGd = Math.max(0, ...rows.map((r) => Math.abs(r.goalDifference)));
  return Math.min(9, Math.max(5, maxAbsGd + 3));
}

/** Full scoreline grid 0..K for each side — exhaustive over the saturating range. */
export function fullCandidates(k: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let h = 0; h <= k; h++) for (let a = 0; a <= k; a++) out.push([h, a]);
  return out;
}

/** Bounded representative scorelines covering boundary margins (min decisive +
 * saturating large) plus low/high draws — used when there are many remaining
 * fixtures. */
export function reducedCandidates(k: number): Array<[number, number]> {
  return [
    [0, 0],
    [1, 1],
    [2, 2],
    [1, 0],
    [0, 1],
    [k, 0],
    [0, k],
    [k, k],
  ];
}

export const MAX_SCENARIOS = 2_000_000;

/** Choose the candidate scoreline set and verify the combination count is bounded. */
export function candidateScorelines(
  completed: MatchResult[],
  remaining: RemainingMatch[],
  teams: Team[],
): Array<[number, number]> {
  const k = saturatingMargin(completed, teams);
  const candidates = remaining.length <= 2 ? fullCandidates(k) : reducedCandidates(k);
  const combos = Math.pow(candidates.length, remaining.length);
  if (combos > MAX_SCENARIOS) {
    throw new Error(`Too many scenarios (${combos}) for ${remaining.length} remaining fixtures`);
  }
  return candidates;
}
