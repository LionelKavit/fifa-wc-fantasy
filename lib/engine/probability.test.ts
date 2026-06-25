import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { advancementProbabilities } from "./probability";
import { normalize, type RawPayloads } from "../data/normalize";
import { PlayersPayloadSchema, SquadsPayloadSchema, RoundsPayloadSchema, validate } from "../data/schema";
import { team, done, todo, snapshot } from "./testutil";

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

describe("advancement probability — live snapshot", () => {
  const snap = loadSnapshot();
  const report = advancementProbabilities(snap, { trials: 3000, seed: 1 });

  it("reports every team a probability in [0, 1] with a method", () => {
    expect(report.teams.length).toBe(48);
    for (const t of report.teams) {
      expect(t.probability).toBeGreaterThanOrEqual(0);
      expect(t.probability).toBeLessThanOrEqual(1);
      expect(["clinched", "eliminated", "simulated"]).toContain(t.method);
      if (t.conditional) {
        for (const v of [t.conditional.win, t.conditional.draw, t.conditional.loss]) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("pins a clinched leader to certainty without sampling noise", () => {
    const mex = report.teams.find((t) => t.abbr === "MEX")!;
    expect(mex.method).toBe("clinched");
    expect(mex.probability).toBe(1);
    expect(mex.conditional).toEqual({ win: 1, draw: 1, loss: 1 });
  });

  it("is reproducible for a fixed seed", () => {
    const again = advancementProbabilities(snap, { trials: 3000, seed: 1 });
    const a = report.teams.map((t) => [t.teamId, t.probability]);
    const b = again.teams.map((t) => [t.teamId, t.probability]);
    expect(a).toEqual(b);
  });
});

describe("advancement probability — deterministic pinning", () => {
  // T1 & T2 clinched; T4 cannot finish even third → outright eliminated.
  const teams = [team(1, "AAA"), team(2, "BBB"), team(3, "CCC"), team(4, "DDD")];
  const snap = snapshot(teams, [
    done(1, 3, 1, 0),
    done(2, 3, 1, 0),
    done(1, 4, 1, 0),
    done(2, 4, 1, 0),
    done(3, 4, 1, 0),
    todo(1, 2),
  ]);
  const report = advancementProbabilities(snap, { trials: 500, seed: 1 });
  const find = (id: number) => report.teams.find((t) => t.teamId === id)!;

  it("pins clinched teams to 1.0", () => {
    expect(find(1).method).toBe("clinched");
    expect(find(1).probability).toBe(1);
  });

  it("pins outright-eliminated teams to 0.0", () => {
    expect(find(4).method).toBe("eliminated");
    expect(find(4).probability).toBe(0);
    expect(find(4).conditional ?? { win: 0, draw: 0, loss: 0 }).toBeDefined();
  });
});
