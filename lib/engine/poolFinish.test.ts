import { describe, it, expect } from "vitest";
import type { TournamentSnapshot, Team, Fixture } from "../data/models";
import { evaluatePoolFinish, pickLeverage, sampleOpponentBracket, PUBLIC_CHALK_GAMMA } from "./poolFinish";
import { buildBracket } from "./bracket";
import { predictedParticipants } from "./prediction";
import { mulberry32 } from "./rng";
import { KO_LAYOUT } from "./bracketLayout";
import type { OutcomeModel } from "./outcome";
import type { Prediction } from "./types";

// --- Synthetic snapshot: 12 groups, all group games decided so the R32 is determined. ---
const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] as const;
const groupTeamId = (gi: number, p: number): number => gi * 4 + p;
let seq = 30000;
function done(homeId: number, awayId: number, hs: number, as: number, stage: Fixture["stage"] = "GROUP"): Fixture {
  return { id: seq++, roundId: 1, stage, status: "complete", kickoff: "2026-06-12T00:00:00Z", homeTeamId: homeId, awayTeamId: awayId, homeScore: hs, awayScore: as, venue: null };
}
function finalGroupFixtures(gi: number): Fixture[] {
  const t = (p: number) => groupTeamId(gi, p);
  // p1 > p2 > p3 > p4 by results, so standings (and thus the R32 field) are determined.
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

const snapshot = snapshotWith();
const bracket = buildBracket(snapshot);

// Higher team id = stronger. matchupWinProb and the models agree on this.
const matchupWinProb = (a: number, b: number): number => (a > b ? 0.85 : 0.15);
const strengths = new Map(snapshot.teams.map((t) => [t.id, Math.exp((t.id - 24) / 24)]));
const favModel: OutcomeModel = (m, rng) => {
  const sa = strengths.get(m.homeId) ?? 1;
  const sb = strengths.get(m.awayId) ?? 1;
  // Stronger team gets the higher rate; small randomness via the rng for variance.
  return [Math.round(1.3 * sa + rng()), Math.round(1.3 * sb + rng())];
};
// Deterministic: the higher-id team always wins (no extra time needed).
const deterministicFav: OutcomeModel = (m) => (m.homeId > m.awayId ? [1, 0] : [0, 1]);

/** Build a complete prediction by walking the bracket and choosing at each match. */
function buildPrediction(chooser: (a: number, b: number) => number): Prediction {
  const pred: Prediction = new Map();
  for (const m of bracket.matches) {
    const [a, b] = predictedParticipants(bracket, pred, m.id);
    if (a === null || b === null) continue;
    pred.set(m.id, chooser(a, b));
  }
  return pred;
}
const chalk = buildPrediction((a, b) => (a > b ? a : b)); // always the favorite
const underdog = buildPrediction((a, b) => (a > b ? b : a)); // always the underdog

describe("pool finish — determinism", () => {
  it("returns identical results for identical inputs", () => {
    const opts = { poolSize: 8, matchupWinProb, model: favModel, seed: 7, trials: 300 };
    expect(evaluatePoolFinish(snapshot, chalk, opts)).toEqual(evaluatePoolFinish(snapshot, chalk, opts));
  });
});

describe("pool finish — sanity", () => {
  it("a pool of one is a guaranteed win", () => {
    const r = evaluatePoolFinish(snapshot, chalk, { poolSize: 1, matchupWinProb, model: favModel, trials: 200 });
    expect(r.complete).toBe(true);
    if (r.complete) {
      expect(r.winProbability).toBe(1);
      expect(r.expectedFinish).toBe(1);
    }
  });

  it("the chalk bracket out-finishes an all-underdog bracket", () => {
    const opts = { poolSize: 8, matchupWinProb, model: favModel, seed: 3, trials: 800 };
    const c = evaluatePoolFinish(snapshot, chalk, opts);
    const u = evaluatePoolFinish(snapshot, underdog, opts);
    expect(c.complete && u.complete).toBe(true);
    if (c.complete && u.complete) {
      expect(c.winProbability).toBeGreaterThan(u.winProbability);
      expect(c.expectedFinish).toBeLessThan(u.expectedFinish);
    }
  });
});

describe("pool finish — opponent field", () => {
  it("samples feasible opponent brackets", () => {
    const opp = sampleOpponentBracket(bracket, matchupWinProb, PUBLIC_CHALK_GAMMA, mulberry32(1));
    for (const layout of KO_LAYOUT) {
      const winner = opp.get(`M${layout.match}`);
      if (winner === undefined) continue;
      // The winner of a later match must be one of its feeder winners in this same bracket.
      expect([opp.get(`M${layout.home}`), opp.get(`M${layout.away}`)]).toContain(winner);
    }
  });

  it("picks the favorite more often as gamma rises", () => {
    const favRate = (gamma: number): number => {
      const rng = mulberry32(42);
      let favCount = 0;
      let total = 0;
      for (let i = 0; i < 250; i++) {
        const o = sampleOpponentBracket(bracket, matchupWinProb, gamma, rng);
        for (const m of bracket.matches) {
          const [a, b] = predictedParticipants(bracket, o, m.id);
          if (a === null || b === null) continue;
          const favorite = matchupWinProb(a, b) >= 0.5 ? a : b;
          if (o.get(m.id) === favorite) favCount++;
          total++;
        }
      }
      return favCount / total;
    };
    expect(favRate(3)).toBeGreaterThan(favRate(1));
  });
});

describe("pool finish — tie handling", () => {
  it("splits the win on a two-way tie for first", () => {
    // gamma huge → the lone opponent picks the all-favorite bracket, identical to the
    // chalk user, so they tie every trial.
    const r = evaluatePoolFinish(snapshot, chalk, { poolSize: 2, matchupWinProb, model: favModel, gamma: 50, seed: 5, trials: 400 });
    expect(r.complete).toBe(true);
    if (r.complete) {
      expect(r.winProbability).toBeCloseTo(0.5, 6);
      expect(r.finishDistribution[0]).toBe(1); // no opponent ever strictly above → always rank 1
    }
  });

  it("competition rank counts only opponents strictly above", () => {
    // Deterministic favorites win; 3 favorite-picking opponents all beat the all-underdog user.
    const r = evaluatePoolFinish(snapshot, underdog, { poolSize: 4, matchupWinProb, model: deterministicFav, gamma: 50, seed: 1, trials: 50 });
    expect(r.complete).toBe(true);
    if (r.complete) {
      expect(r.winProbability).toBe(0);
      expect(r.finishDistribution[3]).toBe(1); // rank 4 every trial
    }
  });
});

describe("pool finish — completeness", () => {
  it("returns an incomplete signal for an unfinished bracket", () => {
    const partial: Prediction = new Map([["M73", groupTeamId(0, 2)]]);
    const r = evaluatePoolFinish(snapshot, partial, { poolSize: 8, matchupWinProb, model: favModel, trials: 50 });
    expect(r.complete).toBe(false);
  });

  it("a complete bracket yields a finish distribution summing to 1", () => {
    const r = evaluatePoolFinish(snapshot, chalk, { poolSize: 5, matchupWinProb, model: favModel, trials: 200 });
    expect(r.complete).toBe(true);
    if (r.complete) {
      expect(r.finishDistribution).toHaveLength(5);
      expect(r.finishDistribution.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 10);
    }
  });
});

describe("pool finish — per-pick leverage", () => {
  it("a contrarian champion pick that hurts has negative leverage", () => {
    const [fa, fb] = predictedParticipants(bracket, chalk, "M104");
    const fav = matchupWinProb(fa!, fb!) >= 0.5 ? fa! : fb!;
    const dog = fav === fa ? fb! : fa!;
    const cf = new Map(chalk);
    cf.set("M104", dog); // chalk everywhere except a losing underdog champion

    const lev = pickLeverage(snapshot, cf, { poolSize: 2, matchupWinProb, model: deterministicFav, gamma: 50, seed: 1, trials: 100 });
    const m104 = lev.find((l) => l.matchId === "M104");
    expect(m104).toBeDefined();
    expect(m104!.delta).toBeLessThan(0); // taking the favorite would have helped
  });
});
