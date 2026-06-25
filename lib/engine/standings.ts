// Group standings under FIFA World Cup group ranking criteria.
//
// Order of criteria (FIFA): 1) points, 2) goal difference, 3) goals scored —
// all across every group match; then for teams still level, the same three
// applied to matches between the tied teams only (head-to-head); then fair-play
// points; then drawing of lots. The public feed carries no disciplinary data, so
// the fair-play step is a no-op and ties degrade to a deterministic lots seed
// (ascending team id) so output is reproducible.

import type { TournamentSnapshot, Team, GroupId } from "../data/models";
import type { GroupTable, StandingRow } from "./types";

export interface MatchResult {
  homeId: number;
  awayId: number;
  homeGoals: number;
  awayGoals: number;
}

interface Tally {
  teamId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

function emptyTally(teamId: number): Tally {
  return { teamId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
}

function gd(t: Tally): number {
  return t.gf - t.ga;
}

function applyMatch(h: Tally, a: Tally, hg: number, ag: number): void {
  h.played++;
  a.played++;
  h.gf += hg;
  h.ga += ag;
  a.gf += ag;
  a.ga += hg;
  if (hg > ag) {
    h.won++;
    h.points += 3;
    a.lost++;
  } else if (hg < ag) {
    a.won++;
    a.points += 3;
    h.lost++;
  } else {
    h.drawn++;
    a.drawn++;
    h.points++;
    a.points++;
  }
}

/** Criteria 1–3 across all matches. Returns <0 if a ranks above b. */
function comparePrimary(a: Tally, b: Tally): number {
  if (a.points !== b.points) return b.points - a.points;
  if (gd(a) !== gd(b)) return gd(b) - gd(a);
  if (a.gf !== b.gf) return b.gf - a.gf;
  return 0;
}

/**
 * Break a run of teams tied on criteria 1–3 using head-to-head (criteria 4–6)
 * computed among only that run, then a deterministic lots seed (team id).
 * Because the run is already equal on all-matches points/GD/goals, re-applying
 * criteria 1–3 cannot separate them, so a single head-to-head pass + lots is
 * complete.
 */
function breakTie(run: number[], matches: MatchResult[]): number[] {
  const inRun = new Set(run);
  const h2h = new Map<number, Tally>();
  for (const id of run) h2h.set(id, emptyTally(id));
  for (const m of matches) {
    if (inRun.has(m.homeId) && inRun.has(m.awayId)) {
      applyMatch(h2h.get(m.homeId)!, h2h.get(m.awayId)!, m.homeGoals, m.awayGoals);
    }
  }
  return [...run].sort((a, b) => {
    const cmp = comparePrimary(h2h.get(a)!, h2h.get(b)!);
    if (cmp !== 0) return cmp;
    // fair-play: unavailable in the feed → equal; lots: ascending team id.
    return a - b;
  });
}

function orderTeams(teamIds: number[], tally: Map<number, Tally>, matches: MatchResult[]): number[] {
  const sorted = [...teamIds].sort((a, b) => comparePrimary(tally.get(a)!, tally.get(b)!) || a - b);
  const result: number[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && comparePrimary(tally.get(sorted[i]!)!, tally.get(sorted[j]!)!) === 0) j++;
    const run = sorted.slice(i, j);
    if (run.length === 1) result.push(run[0]!);
    else result.push(...breakTie(run, matches));
    i = j;
  }
  return result;
}

/** Build an ordered standings table for `teams` from an arbitrary match list.
 * Matches involving teams outside the group are ignored. */
export function buildOrderedRows(teams: Team[], matches: MatchResult[]): StandingRow[] {
  const tally = new Map<number, Tally>();
  for (const t of teams) tally.set(t.id, emptyTally(t.id));
  for (const m of matches) {
    const h = tally.get(m.homeId);
    const a = tally.get(m.awayId);
    if (!h || !a) continue;
    applyMatch(h, a, m.homeGoals, m.awayGoals);
  }
  const ordered = orderTeams(
    teams.map((t) => t.id),
    tally,
    matches,
  );
  const teamById = new Map(teams.map((t) => [t.id, t]));
  return ordered.map((id, i) => {
    const x = tally.get(id)!;
    const t = teamById.get(id)!;
    return {
      rank: i + 1,
      teamId: id,
      abbr: t.abbr,
      name: t.name,
      played: x.played,
      won: x.won,
      drawn: x.drawn,
      lost: x.lost,
      goalsFor: x.gf,
      goalsAgainst: x.ga,
      goalDifference: gd(x),
      points: x.points,
    };
  });
}

/** Collect the completed (and optionally live) group fixtures as match results. */
export function groupMatchResults(
  snapshot: TournamentSnapshot,
  groupId: GroupId,
  opts: { includeLive?: boolean } = {},
): { matches: MatchResult[]; foldedLive: boolean } {
  const group = snapshot.groups.find((g) => g.id === groupId);
  if (!group) throw new Error(`Unknown group "${groupId}"`);
  const ids = new Set(group.teams.map((t) => t.id));
  const matches: MatchResult[] = [];
  let foldedLive = false;
  for (const f of snapshot.fixtures) {
    if (f.stage !== "GROUP") continue;
    if (!ids.has(f.homeTeamId) || !ids.has(f.awayTeamId)) continue;
    const hasScore = f.homeScore !== null && f.awayScore !== null;
    if (f.status === "complete" && hasScore) {
      matches.push({ homeId: f.homeTeamId, awayId: f.awayTeamId, homeGoals: f.homeScore!, awayGoals: f.awayScore! });
    } else if (opts.includeLive && f.status === "live" && hasScore) {
      matches.push({ homeId: f.homeTeamId, awayId: f.awayTeamId, homeGoals: f.homeScore!, awayGoals: f.awayScore! });
      foldedLive = true;
    }
  }
  return { matches, foldedLive };
}

/** Compute the ordered group table. Default counts only completed fixtures;
 * `provisional` folds in any live scoreline and marks the table provisional. */
export function computeGroupStandings(
  snapshot: TournamentSnapshot,
  groupId: GroupId,
  opts: { provisional?: boolean } = {},
): GroupTable {
  const group = snapshot.groups.find((g) => g.id === groupId);
  if (!group) throw new Error(`Unknown group "${groupId}"`);
  const { matches, foldedLive } = groupMatchResults(snapshot, groupId, {
    includeLive: opts.provisional ?? false,
  });
  return {
    groupId,
    provisional: foldedLive,
    rows: buildOrderedRows(group.teams, matches),
  };
}
