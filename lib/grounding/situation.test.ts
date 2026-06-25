import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildTeamSituation, buildGroupSituation } from "./situation";
import { advancementProbabilities } from "../engine";
import { normalize, type RawPayloads } from "../data/normalize";
import { PlayersPayloadSchema, SquadsPayloadSchema, RoundsPayloadSchema, validate } from "../data/schema";

function loadSnapshot() {
  const load = (name: string) =>
    JSON.parse(readFileSync(new URL(`../data/__fixtures__/${name}.json`, import.meta.url), "utf8"));
  const raw: RawPayloads = {
    players: validate(PlayersPayloadSchema, load("players"), "players.json"),
    squads: validate(SquadsPayloadSchema, load("squads"), "squads.json"),
    rounds: validate(RoundsPayloadSchema, load("rounds"), "rounds.json"),
  };
  return normalize(raw, "2026-06-24T00:00:00Z");
}

const snap = loadSnapshot();
const mex = snap.teams.find((t) => t.abbr === "MEX")!;

describe("group situation (verdict-only, no report)", () => {
  const g = buildGroupSituation(snap, "a");

  it("contains an ordered table and a situation for all four teams", () => {
    expect(g.table).toHaveLength(4);
    expect(g.teams).toHaveLength(4);
    expect(g.teams[0]!.rank).toBe(1);
  });

  it("omits probability fields when no report is supplied", () => {
    for (const t of g.teams) {
      expect(t.advancementProbability).toBeNull();
      expect(t.conditionalProbability).toBeNull();
    }
  });

  it("reflects the engine verdict and marks decided places", () => {
    const m = g.teams.find((t) => t.teamId === mex.id)!;
    expect(m.advancement).toBe("clinched");
    expect(m.narration).toContain("secured");
    expect(g.decidedPlaces.qualified).toContain(mex.id);
  });

  it("surfaces required-result effects for alive teams", () => {
    const alive = g.teams.find((t) => t.advancement === "contention" && t.ownMatch);
    expect(alive).toBeDefined();
    expect(alive!.ownMatch).not.toBeNull();
    expect(alive!.narration).toContain(alive!.ownMatch!.opponentAbbr);
  });
});

describe("situation with advancement report", () => {
  const report = advancementProbabilities(snap, { trials: 1000, seed: 1 });

  it("includes probability for a clinched team pinned to 1.0", () => {
    const g = buildGroupSituation(snap, "a", report);
    const m = g.teams.find((t) => t.teamId === mex.id)!;
    expect(m.advancementProbability).toBe(1);
  });

  it("buildTeamSituation resolves a team's group and probability", () => {
    const s = buildTeamSituation(snap, mex.id, report);
    expect(s.groupId).toBe("a");
    expect(s.advancement).toBe("clinched");
    expect(s.advancementProbability).toBe(1);
  });

  it("a contended team gets a fractional probability in [0,1] narrated with a %", () => {
    const g = buildGroupSituation(snap, "a", report);
    const contender = g.teams.find((t) => t.advancement === "contention")!;
    expect(contender.advancementProbability).toBeGreaterThanOrEqual(0);
    expect(contender.advancementProbability).toBeLessThanOrEqual(1);
    expect(contender.narration).toContain("%");
  });
});

describe("buildTeamSituation error handling", () => {
  it("throws for an unknown team id", () => {
    expect(() => buildTeamSituation(snap, 99999)).toThrow();
  });
});
