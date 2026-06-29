import { describe, it, expect } from "vitest";
import { poissonHeadToHead, createPoissonModel } from "./outcome";
import { mulberry32, samplePoisson } from "./rng";
import { DEFAULT_KO_EXTRA_TIME_LAMBDA } from "./montecarlo";

describe("poissonHeadToHead", () => {
  it("is bounded, complementary, and favors the stronger team", () => {
    const p = poissonHeadToHead(2.0, 1.0);
    expect(p).toBeGreaterThan(0.5);
    expect(p).toBeLessThanOrEqual(1);
    expect(p + poissonHeadToHead(1.0, 2.0)).toBeCloseTo(1, 12); // complementary
    expect(poissonHeadToHead(1.0, 1.0)).toBeCloseTo(0.5, 12); // equal strengths → toss-up
  });

  it("applies the host home advantage only when asked", () => {
    expect(poissonHeadToHead(1, 1)).toBeCloseTo(0.5, 12); // neutral
    expect(poissonHeadToHead(1, 1, { homeIsA: true })).toBeGreaterThan(0.5); // host A at home
  });

  it("is deterministic", () => {
    expect(poissonHeadToHead(1.4, 0.8)).toBe(poissonHeadToHead(1.4, 0.8));
  });

  it("equals a Monte-Carlo of the same match (it is the analytic expectation)", () => {
    const sA = 1.6;
    const sB = 0.9;
    const model = createPoissonModel({ strengths: new Map([[1, sA], [2, sB]]), hosts: new Set() }); // neutral
    const rng = mulberry32(1);
    const N = 60_000;
    let aWins = 0;
    for (let i = 0; i < N; i++) {
      const [ha, hb] = model({ homeId: 1, awayId: 2 }, rng);
      let win: boolean;
      if (ha !== hb) win = ha > hb;
      else {
        const ea = samplePoisson(DEFAULT_KO_EXTRA_TIME_LAMBDA, rng);
        const eb = samplePoisson(DEFAULT_KO_EXTRA_TIME_LAMBDA, rng);
        win = ea !== eb ? ea > eb : rng() < 0.5; // symmetric ET then 50/50 penalties
      }
      if (win) aWins++;
    }
    expect(Math.abs(aWins / N - poissonHeadToHead(sA, sB))).toBeLessThan(0.01);
  });
});
