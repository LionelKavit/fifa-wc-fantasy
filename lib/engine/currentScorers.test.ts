import { describe, it, expect } from "vitest";
import { currentTopScorers, allTimeScoringRecord } from "./currentScorers";
import type { TournamentSnapshot, Team, Player, Fixture, GoalEvent } from "../data/models";

function team(id: number, name: string, abbr: string): Team {
  return { id, name, abbr, group: "a", isEliminated: false };
}
function player(id: number, name: string, teamId: number): Player {
  return {
    id,
    name,
    firstName: name.split(" ")[0] ?? null,
    lastName: name.split(" ").slice(1).join(" ") || null,
    knownName: name,
    teamId,
    position: "FWD",
    price: 0,
    status: "available",
    ownership: 0,
    form: 0,
    totalPoints: 0,
  };
}
function fixture(id: number, goals: GoalEvent[]): Fixture {
  return {
    id,
    roundId: 1,
    stage: "GROUP",
    status: "complete",
    kickoff: "2026-06-11T00:00:00Z",
    homeTeamId: 1,
    awayTeamId: 2,
    homeScore: 0,
    awayScore: 0,
    venue: null,
    goals,
  };
}
function snapshot(teams: Team[], players: Player[], fixtures: Fixture[]): TournamentSnapshot {
  return { fetchedAt: "2026-06-11T00:00:00Z", teams, groups: [], players, rounds: [], fixtures };
}

describe("current top scorers", () => {
  const teams = [team(1, "Argentina", "ARG"), team(2, "France", "FRA")];
  const players = [
    player(10, "Lionel Messi", 1),
    player(11, "Julian Alvarez", 1),
    player(20, "Kylian Mbappe", 2),
    player(99, "Own Goaler", 2),
  ];

  it("counts goals (excluding own goals) and assists, joined to nation, ranked", () => {
    const fx = fixture(1, [
      { playerId: 10, assistId: 11, isOwnGoal: false },
      { playerId: 10, assistId: null, isOwnGoal: false },
      { playerId: 20, assistId: null, isOwnGoal: false },
      { playerId: 99, assistId: null, isOwnGoal: true },
    ]);
    const top = currentTopScorers(snapshot(teams, players, [fx]));
    expect(top.map((s) => s.name)).toEqual(["Lionel Messi", "Kylian Mbappe"]);
    // Messi scored both; the assist was credited to Alvarez (#11), so Messi's assists = 0.
    expect(top[0]).toMatchObject({ name: "Lionel Messi", nation: "Argentina", goals: 2, assists: 0 });
    expect(top[1]).toMatchObject({ name: "Kylian Mbappe", goals: 1 });
    // the own goal scorer is not credited
    expect(top.find((s) => s.playerId === 99)).toBeUndefined();
    // an assist-only player is not a scorer
    expect(top.find((s) => s.playerId === 11)).toBeUndefined();
  });

  it("reports no scorers when there are no goals", () => {
    expect(currentTopScorers(snapshot(teams, players, [fixture(1, [])]))).toEqual([]);
  });
});

describe("live all-time scoring record", () => {
  const teams = [team(1, "Argentina", "ARG")];
  const players = [player(10, "Lionel Messi", 1)];

  it("flags the record broken when an active player passes the historical record", () => {
    // Messi is 13 in the through-2022 history; 5 in 2026 → 18 > Klose's 16.
    const goals: GoalEvent[] = Array.from({ length: 5 }, () => ({ playerId: 10, assistId: null, isOwnGoal: false }));
    const rec = allTimeScoringRecord(snapshot(teams, players, [fixture(1, goals)]))!;
    expect(rec.previousRecord).toMatchObject({ player: "Miroslav Klose", goals: 16 });
    expect(rec.broken).toBe(true);
    expect(rec.breaker?.player).toBe("Lionel Messi");
    expect(rec.leader.player).toBe("Lionel Messi");
    expect(rec.leader.careerGoals).toBe(18);
    expect(rec.leader.goals2026).toBe(5);
  });

  it("keeps the historical holder when nobody has passed the record", () => {
    const rec = allTimeScoringRecord(snapshot(teams, players, [fixture(1, [])]))!;
    expect(rec.broken).toBe(false);
    expect(rec.leader.player).toBe("Miroslav Klose");
    expect(rec.leader.careerGoals).toBe(16);
  });
});
