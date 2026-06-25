import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { computeQualificationVerdicts } from "./verdict";
import { normalize, type RawPayloads } from "../data/normalize";
import { PlayersPayloadSchema, SquadsPayloadSchema, RoundsPayloadSchema, validate } from "../data/schema";
import { team, done, todo, snapshot } from "./testutil";
import type { GroupQualification, TeamQualification } from "./types";

const teams = [team(1, "AAA"), team(2, "BBB"), team(3, "CCC"), team(4, "DDD")];
const find = (q: GroupQualification, id: number): TeamQualification =>
  q.teams.find((t) => t.teamId === id)!;

describe("verdict — clinched / third-place / outright elimination", () => {
  // T1 & T2 each beat T3 & T4; T3 beat T4; only T1 vs T2 remains.
  const snap = snapshot(teams, [
    done(1, 3, 1, 0),
    done(2, 3, 1, 0),
    done(1, 4, 1, 0),
    done(2, 4, 1, 0),
    done(3, 4, 1, 0),
    todo(1, 2),
  ]);
  const q = computeQualificationVerdicts(snap, "a");

  it("classifies the two leaders as clinched regardless of their head-to-head", () => {
    expect(find(q, 1).topTwo).toBe("clinched");
    expect(find(q, 2).topTwo).toBe("clinched");
    expect(find(q, 1).advancement).toBe("clinched");
  });

  it("flags a third-place-only team without falsely eliminating it", () => {
    const t3 = find(q, 3);
    expect(t3.topTwo).toBe("eliminated"); // out of the top 2
    expect(t3.advancement).toBe("thirdPlaceRace"); // but NOT outright eliminated
    expect(t3.thirdPlaceEligible).toBe(true);
  });

  it("marks a team that cannot even finish third as outright eliminated", () => {
    const t4 = find(q, 4);
    expect(t4.topTwo).toBe("eliminated");
    expect(t4.advancement).toBe("eliminated");
    expect(t4.thirdPlaceEligible).toBe(false);
    expect(t4.bestPossibleRank).toBe(4);
  });
});

describe("verdict — alive teams, own-result conditions, margin sensitivity", () => {
  // Pre-final: T1=T2=4pts (GD+1); T3=T4=1pt (GD-1). Remaining: T1v T2, T3 v T4.
  const snap = snapshot(teams, [
    done(1, 3, 1, 0), // T1 beats T3
    done(1, 4, 0, 0), // T1 draws T4
    done(2, 4, 1, 0), // T2 beats T4
    done(2, 3, 0, 0), // T2 draws T3
    todo(1, 2),
    todo(3, 4),
  ]);
  const q = computeQualificationVerdicts(snap, "a");

  it("classifies a contender as alive with self-determining results", () => {
    const t1 = find(q, 1);
    expect(t1.topTwo).toBe("alive");
    expect(t1.ownMatch).not.toBeNull();
    // A win or draw secures top 2; a loss leaves it dependent on other results.
    expect(t1.ownMatch!.win).toBe("clinch");
    expect(t1.ownMatch!.draw).toBe("clinch");
    expect(t1.ownMatch!.loss).toBe("depends");
  });

  it("requires a margin-sensitive win for the trailing team (boundary enumeration)", () => {
    const t3 = find(q, 3);
    expect(t3.topTwo).toBe("alive");
    // Only a win keeps top-2 alive — and only by a large enough margin, which the
    // boundary enumeration must capture; a 1-goal win is not always enough.
    expect(t3.ownMatch!.win).toBe("depends");
    expect(t3.ownMatch!.draw).toBe("eliminated");
    expect(t3.ownMatch!.loss).toBe("eliminated");
  });
});

describe("verdict — against the recorded live snapshot (group a)", () => {
  function loadFixture(name: string): unknown {
    return JSON.parse(readFileSync(new URL(`../data/__fixtures__/${name}.json`, import.meta.url), "utf8"));
  }
  const raw: RawPayloads = {
    players: validate(PlayersPayloadSchema, loadFixture("players"), "players.json"),
    squads: validate(SquadsPayloadSchema, loadFixture("squads"), "squads.json"),
    rounds: validate(RoundsPayloadSchema, loadFixture("rounds"), "rounds.json"),
  };
  const snap = normalize(raw, "2026-06-24T00:00:00Z");
  const q = computeQualificationVerdicts(snap, "a");

  it("returns a coherent verdict for all four teams", () => {
    expect(q.teams).toHaveLength(4);
    for (const t of q.teams) {
      expect(["clinched", "alive", "eliminated"]).toContain(t.topTwo);
      expect(["clinched", "contention", "thirdPlaceRace", "eliminated"]).toContain(t.advancement);
      expect(t.bestPossibleRank).toBeLessThanOrEqual(t.worstPossibleRank);
    }
  });

  it("ranks group leader Mexico as a top-2 lock", () => {
    const mex = q.teams.find((t) => t.abbr === "MEX")!;
    expect(mex).toBeDefined();
    expect(mex.bestPossibleRank).toBe(1);
    expect(mex.advancement).not.toBe("eliminated");
  });
});
