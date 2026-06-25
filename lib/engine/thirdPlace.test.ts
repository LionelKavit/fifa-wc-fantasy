import { describe, it, expect } from "vitest";
import { rankThirdPlaced } from "./thirdPlace";
import type { StandingRow } from "./types";

function row(teamId: number, points: number, goalDifference: number, goalsFor: number): StandingRow {
  return {
    rank: 3,
    teamId,
    abbr: `T${teamId}`,
    name: `T${teamId}`,
    played: 3,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor,
    goalsAgainst: goalsFor - goalDifference,
    goalDifference,
    points,
  };
}

describe("rankThirdPlaced", () => {
  it("selects exactly 8 of 12 by points", () => {
    // teams 1..12 with descending points 12..1
    const rows = Array.from({ length: 12 }, (_, i) => row(i + 1, 12 - i, 0, 5));
    const res = rankThirdPlaced(rows);
    expect(res.qualified).toHaveLength(8);
    expect(res.notQualified).toHaveLength(4);
    expect(res.qualified).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("ranks by points, then goal difference, then goals scored", () => {
    const rows = [
      row(1, 4, 0, 2), // tie on points with 2 & 3
      row(2, 4, 2, 2), // best GD
      row(3, 4, 0, 5), // same GD as 1 but more goals
    ];
    expect(rankThirdPlaced(rows, 3).ranked).toEqual([2, 3, 1]);
  });

  it("resolves a full tie deterministically by lots (team id) and is pure", () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(12 - i, 3, 0, 3)); // all equal, ids 12..1
    const a = rankThirdPlaced(rows);
    const b = rankThirdPlaced(rows);
    expect(a.qualified).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // lowest ids win the lots
    expect(b).toEqual(a);
  });
});
