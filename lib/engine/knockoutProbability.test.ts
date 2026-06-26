import { describe, it, expect } from "vitest";
import type { TournamentSnapshot, Team, Fixture } from "../data/models";
import { knockoutProbabilities } from "./knockoutProbability";

const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] as const;
const groupTeamId = (letterIdx: number, posInGroup: number): number => letterIdx * 4 + posInGroup;

function allTeams(): Team[] {
  const teams: Team[] = [];
  LETTERS.forEach((letter, gi) => {
    for (let p = 1; p <= 4; p++) {
      const id = groupTeamId(gi, p);
      teams.push({ id, name: `${letter.toUpperCase()}${p}`, abbr: `${letter.toUpperCase()}${p}`, group: letter, isEliminated: false });
    }
  });
  return teams;
}

let seq = 9000;
function done(homeId: number, awayId: number, hs: number, as: number, stage: Fixture["stage"] = "GROUP"): Fixture {
  return {
    id: seq++,
    roundId: 1,
    stage,
    status: "complete",
    kickoff: "2026-06-12T00:00:00Z",
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeScore: hs,
    awayScore: as,
    venue: null,
  };
}

/** Completed round-robin for one group where p1 > p2 > p3 > p4 on points. */
function finalGroupFixtures(gi: number): Fixture[] {
  const t = (p: number) => groupTeamId(gi, p);
  return [
    done(t(1), t(2), 1, 0),
    done(t(1), t(3), 1, 0),
    done(t(1), t(4), 1, 0),
    done(t(2), t(3), 1, 0),
    done(t(2), t(4), 1, 0),
    done(t(3), t(4), 1, 0),
  ];
}

function allGroupsFinalSnapshot(extra: Fixture[] = []): TournamentSnapshot {
  const teams = allTeams();
  const groups = LETTERS.map((id) => ({ id, teams: teams.filter((t) => t.group === id) }));
  const fixtures: Fixture[] = [];
  for (let gi = 0; gi < 12; gi++) fixtures.push(...finalGroupFixtures(gi));
  fixtures.push(...extra);
  return { fetchedAt: "2026-06-26T00:00:00Z", teams, groups, players: [], rounds: [], fixtures };
}

const OPTS = { trials: 3000, seed: 7 };

describe("knockout probabilities — deep run", () => {
  it("reports monotonic, in-range stage probabilities", () => {
    const report = knockoutProbabilities(allGroupsFinalSnapshot(), OPTS);
    for (const t of report.teams) {
      for (const p of [t.reachR16, t.reachQF, t.reachSF, t.reachFinal, t.champion]) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
      expect(t.reachR16).toBeGreaterThanOrEqual(t.reachQF);
      expect(t.reachQF).toBeGreaterThanOrEqual(t.reachSF);
      expect(t.reachSF).toBeGreaterThanOrEqual(t.reachFinal);
      expect(t.reachFinal).toBeGreaterThanOrEqual(t.champion);
    }
  });

  it("champion probabilities sum to one tournament", () => {
    const report = knockoutProbabilities(allGroupsFinalSnapshot(), OPTS);
    const total = report.teams.reduce((s, t) => s + t.champion, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it("pins eliminated teams (out of the Round of 32) to all zeros", () => {
    const report = knockoutProbabilities(allGroupsFinalSnapshot(), OPTS);
    const byId = new Map(report.teams.map((t) => [t.teamId, t]));
    // Every group's 4th-placed team cannot reach the Round of 32.
    const last = byId.get(groupTeamId(0, 4))!; // A4
    expect(last.method).toBe("eliminated");
    expect([last.reachR16, last.reachQF, last.reachSF, last.reachFinal, last.champion]).toEqual([0, 0, 0, 0, 0]);
  });

  it("respects a completed knockout result across all trials", () => {
    // Match 75 = Winner F (F1=21) vs Runner-up C (C2=10). Fix F1 as the winner.
    const f1 = groupTeamId(5, 1);
    const c2 = groupTeamId(2, 2);
    const report = knockoutProbabilities(allGroupsFinalSnapshot([done(f1, c2, 2, 0, "R32")]), OPTS);
    const byId = new Map(report.teams.map((t) => [t.teamId, t]));
    expect(byId.get(f1)!.reachR16).toBe(1); // always wins its fixed R32 tie
    expect(byId.get(c2)!.reachR16).toBe(0); // always loses it
  });

  it("reports matchup conditionals that sum to one and only for realized pairings", () => {
    const report = knockoutProbabilities(allGroupsFinalSnapshot(), OPTS);
    expect(report.matchups.length).toBeGreaterThan(0);
    for (const m of report.matchups) {
      expect(m.meetings).toBeGreaterThan(0);
      expect(m.aWinProb + m.bWinProb).toBeCloseTo(1, 6);
    }
  });

  it("is deterministic for the same snapshot, trials, and seed", () => {
    const a = knockoutProbabilities(allGroupsFinalSnapshot(), OPTS);
    const b = knockoutProbabilities(allGroupsFinalSnapshot(), OPTS);
    expect(a.teams).toEqual(b.teams);
    expect(a.matchups).toEqual(b.matchups);
  });
});
