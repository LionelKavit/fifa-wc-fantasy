// Live-match detection from a tournament snapshot.
import type { TournamentSnapshot } from "../data/models";

export interface LiveFixture {
  fixtureId: number;
  groupId: string | null;
  homeTeamId: number;
  awayTeamId: number;
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number;
  awayScore: number;
}

/** True if any fixture is currently in progress. */
export function hasLiveFixtures(snapshot: TournamentSnapshot): boolean {
  return snapshot.fixtures.some((f) => f.status === "live");
}

/** All in-progress fixtures with their current scores. */
export function liveFixtures(snapshot: TournamentSnapshot): LiveFixture[] {
  const teamById = new Map(snapshot.teams.map((t) => [t.id, t]));
  return snapshot.fixtures
    .filter((f) => f.status === "live")
    .map((f) => {
      const home = teamById.get(f.homeTeamId);
      const away = teamById.get(f.awayTeamId);
      return {
        fixtureId: f.id,
        groupId: home?.group ?? null,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        homeAbbr: home?.abbr ?? "???",
        awayAbbr: away?.abbr ?? "???",
        homeScore: f.homeScore ?? 0,
        awayScore: f.awayScore ?? 0,
      };
    });
}

/** In-progress fixtures within a single group. */
export function liveFixturesForGroup(snapshot: TournamentSnapshot, groupId: string): LiveFixture[] {
  return liveFixtures(snapshot).filter((f) => f.groupId === groupId);
}
