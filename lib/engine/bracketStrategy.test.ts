import { describe, it, expect } from "vitest";
import type { TournamentSnapshot, Team, Fixture } from "../data/models";
import { buildBracket } from "./bracket";
import { analyzeStrategy } from "./bracketStrategy";
import type { ModelComparison, PickModelInfo, Prediction, KnockoutStage } from "./types";

const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] as const;
const gt = (gi: number, p: number): number => gi * 4 + p;

let seq = 50000;
const done = (h: number, a: number, hs: number, as: number): Fixture => ({
  id: seq++, roundId: 1, stage: "GROUP", status: "complete", kickoff: "2026-06-12T00:00:00Z",
  homeTeamId: h, awayTeamId: a, homeScore: hs, awayScore: as, venue: null,
});
function finalGroup(gi: number): Fixture[] {
  const t = (p: number) => gt(gi, p);
  return [done(t(1), t(2), 1, 0), done(t(1), t(3), 1, 0), done(t(1), t(4), 1, 0), done(t(2), t(3), 1, 0), done(t(2), t(4), 1, 0), done(t(3), t(4), 1, 0)];
}
function snapshot(): TournamentSnapshot {
  const teams: Team[] = [];
  LETTERS.forEach((letter, gi) => {
    for (let p = 1; p <= 4; p++) teams.push({ id: gt(gi, p), name: `${letter.toUpperCase()}${p}`, abbr: `${letter.toUpperCase()}${p}`, group: letter, isEliminated: false });
  });
  const groups = LETTERS.map((id) => ({ id, teams: teams.filter((t) => t.group === id) }));
  const fixtures: Fixture[] = [];
  for (let gi = 0; gi < 12; gi++) fixtures.push(...finalGroup(gi));
  return { fetchedAt: "2026-06-27T00:00:00Z", teams, groups, players: [], rounds: [], fixtures };
}

const snap = snapshot();
const bracket = buildBracket(snap);

function pick(matchId: string, teamId: number, headToHead: number, bold: boolean): PickModelInfo {
  return { matchId, stage: "R32" as KnockoutStage, pickedTeamId: teamId, modelProb: headToHead, headToHead, status: "pending", bold, upsetBonus: 0, expectedPoints: 0 };
}
function comparison(picks: PickModelInfo[]): ModelComparison {
  return {
    picks,
    survival: { R32: 0, R16: 0, QF: 0, SF: 0, F: 0 },
    headlineSurvival: 0,
    upsetBonusCurrent: 0,
    upsetBonusMax: 0,
    projectedScore: 0,
    boldnessCount: picks.filter((p) => p.bold).length,
    boldnessShare: 0,
    chalk: new Map(),
  };
}

describe("bracket strategy — pool fit", () => {
  it("flags an all-chalk bracket as too safe for a large pool and suggests underdog swaps", () => {
    // M75 = Winner F (21) vs Runner-up C (10); M76 = Winner C (9) vs Runner-up F (22).
    const prediction: Prediction = new Map([["M75", gt(5, 1)], ["M76", gt(2, 1)]]);
    const cmp = comparison([pick("M75", gt(5, 1), 0.7, false), pick("M76", gt(2, 1), 0.65, false)]);
    const a = analyzeStrategy(snap, bracket, prediction, cmp, 50);
    expect(a.verdict).toBe("too-safe");
    expect(a.swaps.length).toBeGreaterThan(0);
    // The suggested 'take' is the match underdog (the other participant), valid.
    const m75 = a.swaps.find((s) => s.matchId === "M75")!;
    expect(m75.takeTeamId).toBe(gt(2, 2)); // C2 (runner-up C), the underdog of M75
    expect(m75.dropTeamId).toBe(gt(5, 1));
  });

  it("flags an all-upset bracket as too risky for a tiny pool and suggests reverting", () => {
    // 3 bold picks in a 2-person pool (band [0,2]) → too risky. M73 = 2A vs 2B.
    const prediction: Prediction = new Map([["M75", gt(2, 2)], ["M76", gt(5, 2)], ["M73", gt(1, 2)]]);
    const cmp = comparison([
      pick("M75", gt(2, 2), 0.3, true),
      pick("M76", gt(5, 2), 0.35, true),
      pick("M73", gt(1, 2), 0.4, true),
    ]);
    const a = analyzeStrategy(snap, bracket, prediction, cmp, 2);
    expect(a.verdict).toBe("too-risky");
    expect(a.swaps.length).toBeGreaterThan(0);
    // The M75 revert suggests the favourite (Winner F = 21).
    const m75 = a.swaps.find((s) => s.matchId === "M75")!;
    expect(m75.takeTeamId).toBe(gt(5, 1));
  });

  it("calls a balanced bracket balanced and suggests no swaps", () => {
    // poolSize 2 → target 1, band [0,2]; 1 bold pick sits in band → balanced.
    const prediction: Prediction = new Map([["M75", gt(2, 2)]]);
    const cmp = comparison([pick("M75", gt(2, 2), 0.3, true)]);
    const b = analyzeStrategy(snap, bracket, prediction, cmp, 2);
    expect(b.verdict).toBe("balanced");
    expect(b.swaps).toEqual([]);
  });
});
