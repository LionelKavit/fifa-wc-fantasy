// Test helpers: construct minimal TournamentSnapshots for one group of 4.
import type { TournamentSnapshot, Team, Fixture } from "../data/models";

export function team(id: number, abbr: string, group = "a"): Team {
  return { id, name: abbr, abbr, group, isEliminated: false };
}

let fixtureSeq = 1000;

/** A completed fixture with a score. */
export function done(homeId: number, awayId: number, hs: number, as: number): Fixture {
  return {
    id: fixtureSeq++,
    roundId: 1,
    stage: "GROUP",
    status: "complete",
    kickoff: "2026-06-12T00:00:00Z",
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeScore: hs,
    awayScore: as,
    venue: null,
  };
}

/** A scheduled (unplayed) fixture. */
export function todo(homeId: number, awayId: number): Fixture {
  return {
    id: fixtureSeq++,
    roundId: 3,
    stage: "GROUP",
    status: "scheduled",
    kickoff: "2026-06-24T00:00:00Z",
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeScore: null,
    awayScore: null,
    venue: null,
  };
}

/** A live (in-progress) fixture carrying a running score. */
export function liveMatch(homeId: number, awayId: number, hs: number, as: number): Fixture {
  return {
    id: fixtureSeq++,
    roundId: 3,
    stage: "GROUP",
    status: "live",
    kickoff: "2026-06-24T00:00:00Z",
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeScore: hs,
    awayScore: as,
    venue: null,
  };
}

export function snapshot(teams: Team[], fixtures: Fixture[], groupId = "a"): TournamentSnapshot {
  return {
    fetchedAt: "2026-06-24T00:00:00Z",
    teams,
    groups: [{ id: groupId, teams }],
    players: [],
    rounds: [],
    fixtures,
  };
}
