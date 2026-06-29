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

// maxPathDepth: 1 keeps these as single-flip regression tests (composite moves off);
// the composite "ride a dark horse" path moves are covered in their own block below.
const base = { matchupWinProb, model, poolSize: 10, candidateCap: 31, seed: 1, maxPathDepth: 1 };

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

describe("generateByLeverage — composite path-aware moves", () => {
  // M73 → M90 is a real parent chain (R32 winner feeds the R16 match), so advancing the
  // M73 underdog one more round forces upsets at both M73 and M90 together.
  const ridesPair = (pred: Prediction) => isUpset(pred, "M73") && isUpset(pred, "M90");

  it("takes a composite path move when no single flip on the path helps on its own", () => {
    // Only the COMBINATION of the two consecutive upsets is rewarded — neither alone.
    const evaluateWinProb = (pred: Prediction) => 0.1 + (ridesPair(pred) ? 0.05 : 0);

    // Single-flip only: cannot assemble the pair in one move → stuck at chalk.
    const single = generateByLeverage(snap, { ...base, maxPathDepth: 1, evaluateWinProb });
    expect(countUpsets(single.prediction)).toBe(0);

    // With composite path moves: the dark horse is advanced through both rounds at once.
    const composite = generateByLeverage(snap, { ...base, maxPathDepth: 5, evaluateWinProb });
    expect(isUpset(composite.prediction, "M73")).toBe(true);
    expect(isUpset(composite.prediction, "M90")).toBe(true);
  });

  it("floor gate reverts a composite that overfits the reduced search trials", () => {
    const searchTrials = 600;
    const finalTrials = 4000;
    const evaluateWinProb = (pred: Prediction, trials: number) =>
      trials <= searchTrials ? 0.1 + (ridesPair(pred) ? 0.05 : 0) : 0.1 - (ridesPair(pred) ? 0.05 : 0);
    const { prediction, winProbability } = generateByLeverage(snap, {
      ...base,
      maxPathDepth: 5,
      searchTrials,
      finalTrials,
      evaluateWinProb,
    });
    expect(isUpset(prediction, "M73")).toBe(false);
    expect(isUpset(prediction, "M90")).toBe(false);
    expect(winProbability).toBe(0.1); // reverted to the seed (chalk)
  });

  it("does not double-count depth-1 path moves (single-flip win probability preserved)", () => {
    // Only a single flip (M104) helps — enabling composite moves must not change the
    // achieved win probability (a path ending at M104 ties it, never beats it).
    const evaluateWinProb = (pred: Prediction) => 0.1 + (isUpset(pred, "M104") ? 0.03 : 0);
    const single = generateByLeverage(snap, { ...base, maxPathDepth: 1, evaluateWinProb });
    const withPaths = generateByLeverage(snap, { ...base, maxPathDepth: 5, evaluateWinProb });
    expect(withPaths.winProbability).toBe(single.winProbability);
    expect(isUpset(withPaths.prediction, "M104")).toBe(true);
    expect(isUpset(single.prediction, "M104")).toBe(true);
  });

  it("is deterministic and bounds evaluations with composite moves enabled", () => {
    let calls = 0;
    const evaluateWinProb = (pred: Prediction) => {
      calls++;
      return 0.1 + (ridesPair(pred) ? 0.05 : 0);
    };
    const maxFlips = 4;
    const a = generateByLeverage(snap, { ...base, maxPathDepth: 5, evaluateWinProb, maxFlips });
    const callsA = calls;
    const b = generateByLeverage(snap, { ...base, maxPathDepth: 5, evaluateWinProb, maxFlips });
    expect([...a.prediction]).toEqual([...b.prediction]); // deterministic
    // per step ≤ single flips (reverts ≤31 + adds ≤31) + path moves (≤31 starts × depth) + finals
    const perStep = 31 + 31 + 31 * 5;
    expect(callsA).toBeLessThanOrEqual(1 + maxFlips * perStep + 2);
  });
});

describe("generateByLeverage — beam search", () => {
  // A greedy trap: M73 alone (0.20) is the single best first move and is "sticky" (nothing
  // extends it), so a width-1 hill-climb commits it and stops. The global optimum is the
  // pair {M104, M97} (0.30), reached via the lower-scoring stepping stone M104 (0.15) — a
  // beam keeps that 2nd-best line and extends it.
  const valley = (pred: Prediction) => {
    const m73 = isUpset(pred, "M73");
    const m104 = isUpset(pred, "M104");
    const m97 = isUpset(pred, "M97");
    if (m104 && m97) return 0.3; // global optimum
    let v = 0.1;
    if (m73) v = Math.max(v, 0.2); // greedy trap (best single move, dead end)
    if (m104) v = Math.max(v, 0.15); // stepping stone toward the optimum
    return v;
  };

  it("reaches a bracket the width-1 hill-climb misses", () => {
    const hill = generateByLeverage(snap, { ...base, beamWidth: 1, evaluateWinProb: valley });
    const beam = generateByLeverage(snap, { ...base, beamWidth: 4, evaluateWinProb: valley });
    expect(hill.winProbability).toBe(0.2); // stuck in the M73 local optimum
    expect(beam.winProbability).toBeGreaterThan(hill.winProbability);
    expect(isUpset(beam.prediction, "M104") && isUpset(beam.prediction, "M97")).toBe(true);
  });

  it("width one behaves as a single-state greedy hill-climb", () => {
    // Monotonic: every upset helps a little → width-1 keeps taking the best single move.
    const monotonic = (pred: Prediction) => 0.1 + 0.01 * countUpsets(pred);
    const a = generateByLeverage(snap, { ...base, beamWidth: 1, evaluateWinProb: monotonic, maxFlips: 5 });
    const b = generateByLeverage(snap, { ...base, beamWidth: 1, evaluateWinProb: monotonic, maxFlips: 5 });
    expect([...a.prediction]).toEqual([...b.prediction]); // deterministic
    expect(countUpsets(a.prediction)).toBeGreaterThan(0);
    // A single helpful flip → width-1 takes exactly it.
    const one = generateByLeverage(snap, { ...base, beamWidth: 1, evaluateWinProb: (p) => 0.1 + (isUpset(p, "M104") ? 0.03 : 0) });
    expect(isUpset(one.prediction, "M104")).toBe(true);
  });

  it("respects the floor gate, never falls below the seed, and is deterministic", () => {
    // Overfit: the pair wins at search trials but loses at full trials → revert to seed.
    const searchTrials = 600;
    const finalTrials = 4000;
    const overfit = (pred: Prediction, trials: number) => {
      const pair = isUpset(pred, "M104") && isUpset(pred, "M97");
      return trials <= searchTrials ? 0.1 + (pair ? 0.1 : 0) : 0.1 - (pair ? 0.1 : 0);
    };
    const gated = generateByLeverage(snap, { ...base, beamWidth: 4, searchTrials, finalTrials, evaluateWinProb: overfit });
    expect(gated.winProbability).toBe(0.1); // floor gate returned the seed (chalk)

    const a = generateByLeverage(snap, { ...base, beamWidth: 4, evaluateWinProb: valley, maxFlips: 4 });
    const b = generateByLeverage(snap, { ...base, beamWidth: 4, evaluateWinProb: valley, maxFlips: 4 });
    expect([...a.prediction]).toEqual([...b.prediction]); // deterministic with stable tie-breaking
  });

  it("bounds evaluations (memoized by canonical state key)", () => {
    let calls = 0;
    const evaluateWinProb = (pred: Prediction) => {
      calls++;
      return 0.1 + 0.01 * countUpsets(pred);
    };
    const beamWidth = 4;
    const maxFlips = 3;
    generateByLeverage(snap, { ...base, beamWidth, maxFlips, evaluateWinProb });
    // ≤ initial seeds (2) + rounds × beamWidth × candidates-per-state (≤31 reverts + ≤31 adds) + finals
    expect(calls).toBeLessThanOrEqual(2 + maxFlips * beamWidth * (31 + 31) + 2);
  });
});
