import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { completedResultsFor } from "./teamResults";
import { normalize, type RawPayloads } from "../../lib/data/normalize";
import { PlayersPayloadSchema, SquadsPayloadSchema, RoundsPayloadSchema, validate } from "../../lib/data/schema";

function loadSnapshot() {
  const load = (name: string) =>
    JSON.parse(readFileSync(new URL(`../../lib/data/__fixtures__/${name}.json`, import.meta.url), "utf8"));
  const raw: RawPayloads = {
    players: validate(PlayersPayloadSchema, load("players"), "players.json"),
    squads: validate(SquadsPayloadSchema, load("squads"), "squads.json"),
    rounds: validate(RoundsPayloadSchema, load("rounds"), "rounds.json"),
  };
  return normalize(raw, "2026-06-24T00:00:00Z");
}

const snap = loadSnapshot();
const mex = snap.teams.find((t) => t.abbr === "MEX")!;

describe("completedResultsFor", () => {
  const results = completedResultsFor(snap, mex.id);

  it("returns Mexico's completed group fixtures with full-time scores", () => {
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const r of results) {
      expect(Number.isInteger(r.teamScore)).toBe(true);
      expect(Number.isInteger(r.opponentScore)).toBe(true);
      expect(["W", "D", "L"]).toContain(r.result);
      expect(r.opponentName).not.toBe("Unknown");
    }
  });

  it("computes the result letter consistently with the score", () => {
    for (const r of results) {
      const expected = r.teamScore > r.opponentScore ? "W" : r.teamScore < r.opponentScore ? "L" : "D";
      expect(r.result).toBe(expected);
    }
  });

  it("includes Mexico's opening win over South Africa (2–0)", () => {
    const vsRsa = results.find((r) => r.opponentAbbr === "RSA");
    expect(vsRsa).toBeDefined();
    expect(vsRsa!.teamScore).toBe(2);
    expect(vsRsa!.opponentScore).toBe(0);
    expect(vsRsa!.result).toBe("W");
  });
});
