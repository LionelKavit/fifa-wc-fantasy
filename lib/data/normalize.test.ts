import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { normalize, NormalizationError, type RawPayloads } from "./normalize";
import {
  PlayersPayloadSchema,
  SquadsPayloadSchema,
  RoundsPayloadSchema,
  validate,
} from "./schema";

function loadFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(new URL(`./__fixtures__/${name}.json`, import.meta.url), "utf8"),
  );
}

function recordedPayloads(): RawPayloads {
  return {
    players: validate(PlayersPayloadSchema, loadFixture("players"), "players.json"),
    squads: validate(SquadsPayloadSchema, loadFixture("squads"), "squads.json"),
    rounds: validate(RoundsPayloadSchema, loadFixture("rounds"), "rounds.json"),
  };
}

describe("normalize (recorded snapshot)", () => {
  const snap = normalize(recordedPayloads(), "2026-06-24T00:00:00.000Z");

  it("produces 48 teams and 12 groups of 4", () => {
    expect(snap.teams).toHaveLength(48);
    expect(snap.groups).toHaveLength(12);
    for (const g of snap.groups) expect(g.teams).toHaveLength(4);
    // groups sorted a–l
    expect(snap.groups.map((g) => g.id)).toEqual([
      "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l",
    ]);
  });

  it("maps every player to a team", () => {
    const teamIds = new Set(snap.teams.map((t) => t.id));
    expect(snap.players.length).toBeGreaterThan(1000);
    for (const p of snap.players) expect(teamIds.has(p.teamId)).toBe(true);
  });

  it("derives player display name (knownName or first+last)", () => {
    const known = snap.players.find((p) => p.knownName !== null);
    if (known) expect(known.name).toBe(known.knownName);
    const unknown = snap.players.find((p) => p.knownName === null);
    if (unknown) expect(unknown.name.length).toBeGreaterThan(0);
  });

  it("flattens fixtures with stage so group fixtures are filterable", () => {
    const group = snap.fixtures.filter((f) => f.stage === "GROUP");
    expect(group.length).toBe(72); // 12 groups × 6 matches
  });

  it("surfaces goal events (scorer, assist, own-goal flag) and defaults to []", () => {
    const withGoals = snap.fixtures.filter((f) => (f.goals?.length ?? 0) > 0);
    expect(withGoals.length).toBeGreaterThan(0);
    const sample = withGoals[0]!.goals![0]!;
    expect(typeof sample.playerId).toBe("number");
    expect(sample.assistId === null || typeof sample.assistId === "number").toBe(true);
    expect(typeof sample.isOwnGoal).toBe("boolean");
    // own-goal flags are preserved from the feed
    const anyOwnGoal = snap.fixtures.some((f) => (f.goals ?? []).some((g) => g.isOwnGoal));
    expect(anyOwnGoal).toBe(true);
    // every fixture has a goals array (empty when the feed gave none)
    for (const f of snap.fixtures) expect(Array.isArray(f.goals)).toBe(true);
  });

  it("completed fixtures carry integer scores; scheduled have null scores", () => {
    const complete = snap.fixtures.filter((f) => f.status === "complete");
    const scheduled = snap.fixtures.filter((f) => f.status === "scheduled");
    expect(complete.length).toBeGreaterThan(0);
    for (const f of complete) {
      expect(Number.isInteger(f.homeScore)).toBe(true);
      expect(Number.isInteger(f.awayScore)).toBe(true);
    }
    for (const f of scheduled) {
      expect(f.homeScore).toBeNull();
      expect(f.awayScore).toBeNull();
    }
  });
});

describe("normalize (referential integrity)", () => {
  const base = recordedPayloads();

  it("throws when a player references an unknown squadId", () => {
    const broken: RawPayloads = {
      ...base,
      players: [{ ...base.players[0]!, squadId: 9999 }],
    };
    expect(() => normalize(broken, "t")).toThrow(NormalizationError);
  });

  it("throws when a group does not have exactly 4 teams", () => {
    const broken: RawPayloads = {
      ...base,
      squads: base.squads.filter((_, i) => i !== 0), // drop one team
      players: [], // avoid unrelated join errors
    };
    expect(() => normalize(broken, "t")).toThrow(NormalizationError);
  });
});
