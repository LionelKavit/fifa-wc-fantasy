import { describe, it, expect } from "vitest";
import { eloStrengths, hostTeamIds, DEFAULT_ELO_K } from "./strength";
import { createPoissonModel } from "./outcome";
import { mulberry32 } from "./rng";
import type { TournamentSnapshot, Team } from "../data/models";

describe("eloStrengths", () => {
  it("maps higher Elo to a higher multiplier, with the mean team ≈ 1", () => {
    const s = eloStrengths({ 1: 2000, 2: 1600, 3: 1800 }); // mean 1800
    expect(s.get(3)).toBeCloseTo(1, 6); // mean team → 1.0
    expect(s.get(1)!).toBeGreaterThan(s.get(3)!);
    expect(s.get(3)!).toBeGreaterThan(s.get(2)!);
    // exp(K·(2000−1800)/400) = exp(0.5)
    expect(s.get(1)!).toBeCloseTo(Math.exp((DEFAULT_ELO_K * 200) / 400), 6);
  });

  it("returns an empty map for no ratings (model falls back to neutral)", () => {
    expect(eloStrengths({}).size).toBe(0);
  });
});

describe("strength in the outcome model", () => {
  it("makes a large rating gap lopsided", () => {
    const strengths = eloStrengths({ 1: 2200, 2: 1500 });
    const model = createPoissonModel({ strengths });
    const rng = mulberry32(1);
    let aWins = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const [g1, g2] = model({ homeId: 1, awayId: 2 }, rng);
      if (g1 > g2) aWins++;
    }
    expect(aWins / N).toBeGreaterThan(0.7); // the much stronger side wins clearly more often
  });

  it("applies home advantage only to host teams when hosts are given", () => {
    const strengths = new Map([
      [1, 1],
      [2, 1],
    ]);
    const model = createPoissonModel({ strengths, hosts: new Set([1]) });
    const rng = mulberry32(7);
    const N = 30000;
    let hostHome = 0;
    let nonHostHome = 0;
    for (let i = 0; i < N; i++) hostHome += model({ homeId: 1, awayId: 9 }, rng)[0];
    for (let i = 0; i < N; i++) nonHostHome += model({ homeId: 2, awayId: 9 }, rng)[0];
    expect(hostHome / N).toBeGreaterThan(nonHostHome / N); // only the host gets the home boost
  });
});

describe("hostTeamIds", () => {
  it("picks out the WC 2026 hosts by abbr", () => {
    const team = (id: number, abbr: string): Team => ({ id, name: abbr, abbr, group: "a", isEliminated: false });
    const snapshot = {
      teams: [team(1, "USA"), team(2, "MEX"), team(3, "CAN"), team(4, "BRA")],
    } as unknown as TournamentSnapshot;
    expect(hostTeamIds(snapshot)).toEqual(new Set([1, 2, 3]));
  });
});
