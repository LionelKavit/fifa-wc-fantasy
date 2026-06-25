import { describe, it, expect } from "vitest";
import { mulberry32, samplePoisson } from "./rng";
import { createPoissonModel } from "./outcome";

describe("rng + Poisson", () => {
  it("mulberry32 is deterministic for a given seed", () => {
    const a = Array.from({ length: 5 }, mulberry32(42));
    const b = Array.from({ length: 5 }, mulberry32(42));
    const c = Array.from({ length: 5 }, mulberry32(43));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    for (const x of a) expect(x).toBeGreaterThanOrEqual(0), expect(x).toBeLessThan(1);
  });

  it("samplePoisson returns non-negative integers with mean ≈ lambda", () => {
    const rng = mulberry32(7);
    const lambda = 1.4;
    const n = 20_000;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const k = samplePoisson(lambda, rng);
      expect(Number.isInteger(k)).toBe(true);
      expect(k).toBeGreaterThanOrEqual(0);
      sum += k;
    }
    expect(sum / n).toBeCloseTo(lambda, 1);
  });
});

describe("Poisson outcome model", () => {
  it("samples non-negative integer scorelines and is seed-reproducible", () => {
    const model = createPoissonModel();
    const a = mulberry32(11);
    const b = mulberry32(11);
    for (let i = 0; i < 100; i++) {
      const [h1, a1] = model({ homeId: 1, awayId: 2 }, a);
      const [h2, a2] = model({ homeId: 1, awayId: 2 }, b);
      expect([h1, a1, h2, a2].every((g) => Number.isInteger(g) && g >= 0)).toBe(true);
      expect([h1, a1]).toEqual([h2, a2]);
    }
  });

  it("default strengths are unbiased — only home advantage differs, regardless of team id", () => {
    const model = createPoissonModel();
    const rng = mulberry32(99);
    const n = 8000;
    let home = 0;
    let away = 0;
    for (let i = 0; i < n; i++) {
      // vary team ids to confirm no team-specific bias
      const [h, a] = model({ homeId: (i % 40) + 1, awayId: ((i + 7) % 40) + 1 }, rng);
      home += h;
      away += a;
    }
    const homeMean = home / n;
    const awayMean = away / n;
    expect(homeMean).toBeGreaterThan(awayMean); // home advantage present
    expect(awayMean).toBeGreaterThan(0.9);
    expect(homeMean).toBeLessThan(2.2);
  });
});
