import { describe, it, expect } from "vitest";
import { templateVerdict, type VerdictFacts } from "./verdictText";

const facts = (winProbability: number, chalkWinProbability: number, poolSize = 20): VerdictFacts => ({
  winProbability,
  chalkWinProbability,
  expectedFinish: 5,
  poolSize,
  pointsRange: { p10: 10, p50: 20, p90: 30, mean: 20 },
});

describe("templateVerdict", () => {
  it("is deterministic", () => {
    expect(templateVerdict(facts(0.1, 0.05))).toBe(templateVerdict(facts(0.1, 0.05)));
  });

  it("buckets the win probability", () => {
    expect(templateVerdict(facts(0.02, 0.02))).toMatch(/long shot/i);
    expect(templateVerdict(facts(0.1, 0.1))).toMatch(/live shot/i);
    expect(templateVerdict(facts(0.25, 0.25))).toMatch(/contender/i);
    expect(templateVerdict(facts(0.5, 0.5))).toMatch(/bracket to beat/i);
  });

  it("compares to chalk", () => {
    expect(templateVerdict(facts(0.2, 0.1))).toMatch(/better than just picking favorites/i);
    expect(templateVerdict(facts(0.1, 0.2))).toMatch(/worse than playing chalk/i);
    expect(templateVerdict(facts(0.1, 0.1))).toMatch(/about the same/i);
  });

  it("names the pool size", () => {
    expect(templateVerdict(facts(0.1, 0.05, 32))).toMatch(/pool of 32/);
  });
});
