import { describe, it, expect } from "vitest";
import type { TournamentSnapshot, Team, Fixture } from "../data/models";
import { scorePrediction, DEFAULT_STAGE_WEIGHTS } from "./predictionScore";
import type { Prediction } from "./types";

const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] as const;
const groupTeamId = (gi: number, p: number): number => gi * 4 + p;

let seq = 12000;
function done(homeId: number, awayId: number, hs: number, as: number, stage: Fixture["stage"] = "GROUP"): Fixture {
  return { id: seq++, roundId: 1, stage, status: "complete", kickoff: "2026-06-12T00:00:00Z", homeTeamId: homeId, awayTeamId: awayId, homeScore: hs, awayScore: as, venue: null };
}
function finalGroupFixtures(gi: number): Fixture[] {
  const t = (p: number) => groupTeamId(gi, p);
  return [done(t(1), t(2), 1, 0), done(t(1), t(3), 1, 0), done(t(1), t(4), 1, 0), done(t(2), t(3), 1, 0), done(t(2), t(4), 1, 0), done(t(3), t(4), 1, 0)];
}
function snapshotWith(extra: Fixture[] = []): TournamentSnapshot {
  const teams: Team[] = [];
  LETTERS.forEach((letter, gi) => {
    for (let p = 1; p <= 4; p++) teams.push({ id: groupTeamId(gi, p), name: `${letter.toUpperCase()}${p}`, abbr: `${letter.toUpperCase()}${p}`, group: letter, isEliminated: false });
  });
  const groups = LETTERS.map((id) => ({ id, teams: teams.filter((t) => t.group === id) }));
  const fixtures: Fixture[] = [];
  for (let gi = 0; gi < 12; gi++) fixtures.push(...finalGroupFixtures(gi));
  fixtures.push(...extra);
  return { fetchedAt: "2026-06-30T00:00:00Z", teams, groups, players: [], rounds: [], fixtures };
}

// Match 75 = Winner F (F1=21) vs Runner-up C (C2=10). Make F1 win it for real.
const F1 = groupTeamId(5, 1);
const C2 = groupTeamId(2, 2);
const B1 = groupTeamId(1, 1); // a team that did NOT reach match 75
const snapshot = snapshotWith([done(F1, C2, 2, 0, "R32")]);

const predOf = (entries: [string, number][]): Prediction => new Map(entries);

describe("prediction scoring — per-pick status", () => {
  it("marks a pick of the real winner correct", () => {
    const score = scorePrediction(snapshot, predOf([["M75", F1]]));
    expect(score.picks[0]!.status).toBe("correct");
    expect(score.picks[0]!.pointsEarned).toBe(DEFAULT_STAGE_WEIGHTS.R32);
  });

  it("marks a team that reached the match but lost wrong", () => {
    const score = scorePrediction(snapshot, predOf([["M75", C2]]));
    expect(score.picks[0]!.status).toBe("wrong");
    expect(score.picks[0]!.pointsEarned).toBe(0);
  });

  it("marks a team that never reached a decided match busted", () => {
    const score = scorePrediction(snapshot, predOf([["M75", B1]]));
    expect(score.picks[0]!.status).toBe("busted");
  });

  it("marks a later pick on an eliminated team busted before that match is played", () => {
    // C2 lost match 75 in reality, so a pick of C2 to win match 90 can never happen.
    const score = scorePrediction(snapshot, predOf([["M90", C2]]));
    expect(score.picks[0]!.status).toBe("busted");
  });

  it("marks an undecided match with an alive team pending", () => {
    // Match 73 has no real result; its participant A2 has not been eliminated.
    const A2 = groupTeamId(0, 2);
    const score = scorePrediction(snapshot, predOf([["M73", A2]]));
    expect(score.picks[0]!.status).toBe("pending");
    expect(score.picks[0]!.pointsEarned).toBe(0);
  });
});

describe("prediction scoring — weights and totals", () => {
  it("uses strictly increasing default weights by round", () => {
    const w = DEFAULT_STAGE_WEIGHTS;
    expect(w.R32).toBeLessThan(w.R16);
    expect(w.R16).toBeLessThan(w.QF);
    expect(w.QF).toBeLessThan(w.SF);
    expect(w.SF).toBeLessThan(w.F);
  });

  it("current counts correct picks; maximum adds pending picks only", () => {
    const A2 = groupTeamId(0, 2);
    const score = scorePrediction(
      snapshot,
      predOf([
        ["M75", F1], // correct → +R32 to both current and max
        ["M76", groupTeamId(2, 1)], // wrong-or-busted (no real result? M76 undecided, picked C1 alive) → pending
        ["M73", A2], // pending → +R32 to max only
      ]),
    );
    expect(score.current).toBe(DEFAULT_STAGE_WEIGHTS.R32); // only M75 correct
    expect(score.maxAchievable).toBeGreaterThan(score.current);
    expect(score.maxAchievable).toBeGreaterThanOrEqual(score.current);
  });

  it("maximum equals current when nothing is pending", () => {
    const score = scorePrediction(
      snapshot,
      predOf([
        ["M75", F1], // correct
        ["M90", C2], // busted (not pending)
      ]),
    );
    expect(score.maxAchievable).toBe(score.current);
    expect(score.current).toBe(DEFAULT_STAGE_WEIGHTS.R32);
  });

  it("honors custom weights", () => {
    const score = scorePrediction(snapshot, predOf([["M75", F1]]), {
      weights: { R32: 5, R16: 6, QF: 7, SF: 8, F: 9 },
    });
    expect(score.current).toBe(5);
  });
});

describe("prediction scoring — purity", () => {
  it("is deterministic and side-effect-free", () => {
    const pred = predOf([["M75", F1], ["M73", groupTeamId(0, 2)]]);
    const a = scorePrediction(snapshot, pred);
    const b = scorePrediction(snapshot, pred);
    expect(a).toEqual(b);
    expect(pred.size).toBe(2); // input unchanged
  });
});
