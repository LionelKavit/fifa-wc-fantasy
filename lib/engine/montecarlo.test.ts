import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { simulate } from "./montecarlo";
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
const entries = (m: Map<number, number>) => [...m.entries()].sort((a, b) => a[0] - b[0]);

describe("Monte Carlo simulation", () => {
  it("advances exactly 32 teams per trial (24 top-2 + 8 best thirds)", () => {
    const trials = 2000;
    const res = simulate(snap, { trials, seed: 1 });
    const totalAdvances = [...res.advanceCount.values()].reduce((a, b) => a + b, 0);
    expect(totalAdvances).toBe(trials * 32);
  });

  it("is reproducible for a fixed seed and differs across seeds", () => {
    const a = simulate(snap, { trials: 1500, seed: 1 });
    const b = simulate(snap, { trials: 1500, seed: 1 });
    const c = simulate(snap, { trials: 1500, seed: 2 });
    expect(entries(a.advanceCount)).toEqual(entries(b.advanceCount));
    expect(entries(a.advanceCount)).not.toEqual(entries(c.advanceCount));
  });

  it("advances a clinched leader (Mexico) in every trial", () => {
    const trials = 1000;
    const res = simulate(snap, { trials, seed: 5 });
    const mex = snap.teams.find((t) => t.abbr === "MEX")!;
    expect(res.advanceCount.get(mex.id)).toBe(trials);
  });
});
