import { describe, it, expect } from "vitest";
import { encodePrediction, decodePrediction } from "./predictionCode";

describe("prediction URL encoding", () => {
  it("round-trips picks, sorted by match number", () => {
    const code = encodePrediction([["M104", 7], ["M73", 2], ["M75", 21]]);
    expect(code).toBe("73-2.75-21.104-7");
    expect(decodePrediction(code)).toEqual([["M73", 2], ["M75", 21], ["M104", 7]]);
  });

  it("is empty for no picks and decodes empty/garbage safely", () => {
    expect(encodePrediction([])).toBe("");
    expect(decodePrediction("")).toEqual([]);
    expect(decodePrediction("garbage.99-")).toEqual([]);
  });

  it("ignores malformed parts but keeps valid ones", () => {
    expect(decodePrediction("75-21.bad.104-7")).toEqual([["M75", 21], ["M104", 7]]);
  });
});
