import { describe, it, expect } from "vitest";
import { mapEloRatings, norm } from "./eloMap.mjs";

// Tiny fixtures (no network). Note SC=853 is a *different* entity than Scotland (SQ).
const WORLD_TSV = [
  "1\t1\tAR\t2144\tx",
  "2\t2\tES\t2134\tx",
  "3\t3\tSQ\t1750\tx",
  "9\t9\tSC\t853\tx", // a valid-but-wrong code Scotland must NOT pick up
  "4\t4\tCV\t1625\tx",
  "5\t5\tLW\t800\tx", // implausibly low → should be flagged suspect
].join("\n");

const TEAMS_TSV = ["AR\tArgentina", "ES\tSpain", "SQ\tScotland", "CV\tCape Verde", "LW\tLowland"].join("\n");

describe("Elo ingestion mapping", () => {
  it("maps every team via name match or override", () => {
    const squads = [
      { id: 1, name: "Argentina", abbr: "ARG" }, // direct name match
      { id: 2, name: "Scotland", abbr: "SCO" }, // override → SQ (not the wrong SC)
      { id: 3, name: "Cabo Verde", abbr: "CPV" }, // our name differs from source "Cape Verde" → override CV
    ];
    const { ratings, missing, suspect } = mapEloRatings({ worldTsv: WORLD_TSV, teamsTsv: TEAMS_TSV, squads });
    expect(missing).toEqual([]);
    expect(suspect).toEqual([]);
    expect(ratings).toEqual({ 1: 2144, 2: 1750, 3: 1625 });
    expect(ratings[2]).not.toBe(853); // Scotland resolved to SQ, not SC
  });

  it("reports unmapped teams instead of guessing", () => {
    const squads = [
      { id: 1, name: "Argentina", abbr: "ARG" },
      { id: 4, name: "Atlantis", abbr: "ATL" }, // no code anywhere
    ];
    const { ratings, missing } = mapEloRatings({ worldTsv: WORLD_TSV, teamsTsv: TEAMS_TSV, squads });
    expect(ratings[4]).toBeUndefined();
    expect(missing.some((m) => m.includes("Atlantis"))).toBe(true);
  });

  it("flags an out-of-range (mis-mapped) rating as suspect", () => {
    const squads = [{ id: 5, name: "Lowland", abbr: "LOW" }]; // maps to LW=800
    const { ratings, suspect } = mapEloRatings({ worldTsv: WORLD_TSV, teamsTsv: TEAMS_TSV, squads });
    expect(ratings[5]).toBe(800);
    expect(suspect.some((s) => s.includes("Lowland"))).toBe(true);
  });

  it("normalizes accents and punctuation", () => {
    expect(norm("Côte d'Ivoire")).toBe("cote divoire");
    expect(norm("Türkiye")).toBe("turkiye");
  });
});
