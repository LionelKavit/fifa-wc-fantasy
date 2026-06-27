import { describe, it, expect } from "vitest";
import type { TournamentSnapshot, Team, Fixture } from "../data/models";
import { generateByLeverage } from "./leverageGenerator";
import { buildBracket } from "./bracket";
import { predictedParticipants } from "./prediction";
import { KO_LAYOUT } from "./bracketLayout";
import { createPoissonModel } from "./outcome";
import type { Prediction } from "./types";

// --- Synthetic snapshot: 12 groups, all group games decided so the R32 is determined. ---
const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] as const;
const groupTeamId = (gi: number, p: number): number => gi * 4 + p;
let seq = 50000;
function done(homeId: number, awayId: number, hs: number, as: number): Fixture {
  return { id: seq++, roundId: 1, stage: "GROUP", status: "complete", kickoff: "2026-06-12T00:00:00Z", homeTeamId: homeId, awayTeamId: awayId, homeScore: hs, awayScore: as, venue: null };
}
function snapshot(): TournamentSnapshot {
  const teams: Team[] = [];
  LETTERS.forEach((letter, gi) => {
    for (let p = 1; p <= 4; p++) teams.push({ id: groupTeamId(gi, p), name: `${letter.toUpperCase()}${p}`, abbr: `${letter.toUpperCase()}${p}`, group: letter, isEliminated: false });
  });
  const groups = LETTERS.map((id) => ({ id, teams: teams.filter((t) => t.group === id) }));
  const fixtures: Fixture[] = [];
  for (let gi = 0; gi < 12; gi++) {
    const t = (p: number) => groupTeamId(gi, p);
    fixtures.push(done(t(1), t(2), 1, 0), done(t(1), t(3), 1, 0), done(t(1), t(4), 1, 0), done(t(2), t(3), 1, 0), done(t(2), t(4), 1, 0), done(t(3), t(4), 1, 0));
  }
  return { fetchedAt: "2026-06-30T00:00:00Z", teams, groups, players: [], rounds: [], fixtures };
}

const snap = snapshot();
const bracket = buildBracket(snap);
const matchupWinProb = (a: number, b: number) => (a > b ? 0.7 : 0.3); // higher id favored, 0.3 underdog → real upset
const model = createPoissonModel({ hosts: new Set() }); // unused when evaluateWinProb is injected

const isUpset = (pred: Prediction, matchId: string): boolean => {
  const [a, b] = predictedParticipants(bracket, pred, matchId);
  if (a === null || b === null) return false;
  const fav = matchupWinProb(a, b) >= 0.5 ? a : b;
  return pred.get(matchId) !== fav;
};
const countUpsets = (pred: Prediction): number => [...pred.keys()].filter((id) => isUpset(pred, id)).length;

const base = { matchupWinProb, model, poolSize: 10, candidateCap: 31, seed: 1 };

describe("generateByLeverage", () => {
  it("greedily takes the flips that raise win probability and skips the rest", () => {
    // Win prob rewards an underdog champion (M104) and a QF upset (M97), penalizes an R32 upset (M73).
    const evaluateWinProb = (pred: Prediction) =>
      0.1 + (isUpset(pred, "M104") ? 0.03 : 0) + (isUpset(pred, "M97") ? 0.02 : 0) - (isUpset(pred, "M73") ? 0.04 : 0);
    const { prediction } = generateByLeverage(snap, { ...base, evaluateWinProb });
    expect(isUpset(prediction, "M104")).toBe(true);
    expect(isUpset(prediction, "M97")).toBe(true);
    expect(isUpset(prediction, "M73")).toBe(false); // negative-lift flip never taken
    expect(countUpsets(prediction)).toBe(2);
  });

  it("returns chalk when no flip helps, and never lowers win probability vs chalk", () => {
    const flat = () => 0.1;
    const { prediction } = generateByLeverage(snap, { ...base, evaluateWinProb: flat });
    expect(countUpsets(prediction)).toBe(0); // pure chalk
  });

  it("takes more upsets when more flips help", () => {
    const each = (pred: Prediction) => 0.1 + 0.01 * countUpsets(pred); // every upset helps a bit
    const { prediction } = generateByLeverage(snap, { ...base, evaluateWinProb: each, maxFlips: 6 });
    expect(countUpsets(prediction)).toBeGreaterThan(2);
  });

  it("floor gate: rejects a flip that looks good at search trials but is worse at full trials", () => {
    const searchTrials = 600;
    const finalTrials = 4000;
    // M104 upset scores higher during the (low-trial) search, but lower at full trials —
    // i.e. the search overfits the reduced sample. The full-trials floor gate must revert.
    const evaluateWinProb = (pred: Prediction, trials: number) =>
      trials <= searchTrials ? 0.1 + (isUpset(pred, "M104") ? 0.05 : 0) : 0.1 - (isUpset(pred, "M104") ? 0.05 : 0);
    const { prediction, winProbability } = generateByLeverage(snap, { ...base, searchTrials, finalTrials, evaluateWinProb });
    expect(isUpset(prediction, "M104")).toBe(false); // reverted to the seed (chalk)
    expect(winProbability).toBe(0.1);
  });

  it("is deterministic and bounds the number of evaluations", () => {
    let calls = 0;
    const evaluateWinProb = (pred: Prediction) => {
      calls++;
      return 0.1 + (isUpset(pred, "M104") ? 0.03 : 0);
    };
    const maxFlips = 5;
    const a = generateByLeverage(snap, { ...base, evaluateWinProb, maxFlips });
    const callsA = calls;
    const b = generateByLeverage(snap, { ...base, evaluateWinProb, maxFlips });
    expect([...a.prediction]).toEqual([...b.prediction]); // deterministic
    // bounded: initial + steps×(adds cap + reverts) + final eval + seed floor-gate eval
    expect(callsA).toBeLessThanOrEqual(1 + maxFlips * (31 + maxFlips) + 2);
  });

  it("seeds from a starting bracket and reverts a starting upset that no longer helps", () => {
    // A seed bracket carrying an M73 upset.
    const { prediction: start } = generateByLeverage(snap, {
      ...base,
      evaluateWinProb: (p) => 0.1 + (isUpset(p, "M73") ? 0.05 : 0),
    });
    expect(isUpset(start, "M73")).toBe(true);
    // Now optimize under an evaluator that penalizes M73 → the bidirectional search reverts it.
    const { prediction } = generateByLeverage(snap, {
      ...base,
      start,
      evaluateWinProb: (p) => 0.2 - (isUpset(p, "M73") ? 0.05 : 0),
    });
    expect(isUpset(prediction, "M73")).toBe(false);
  });

  it("never returns below the seed's win probability and keeps the seed when nothing helps", () => {
    const { prediction: start } = generateByLeverage(snap, {
      ...base,
      evaluateWinProb: (p) => 0.1 + 0.01 * countUpsets(p),
      maxFlips: 6,
    });
    const seedUpsets = countUpsets(start);
    expect(seedUpsets).toBeGreaterThan(0);
    // A flat evaluator: no move beats the seed → seed is preserved, win prob unchanged.
    const { prediction, winProbability } = generateByLeverage(snap, { ...base, start, evaluateWinProb: () => 0.15 });
    expect(winProbability).toBe(0.15);
    expect(countUpsets(prediction)).toBe(seedUpsets);
  });

  it("produces a complete, feasible bracket", () => {
    const { prediction } = generateByLeverage(snap, { ...base, evaluateWinProb: (p) => 0.1 + 0.01 * countUpsets(p) });
    expect(prediction.size).toBe(bracket.matches.length);
    for (const layout of KO_LAYOUT) {
      expect([prediction.get(`M${layout.home}`), prediction.get(`M${layout.away}`)]).toContain(prediction.get(`M${layout.match}`));
    }
  });
});
