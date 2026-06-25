import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  getTournamentData,
  __resetTournamentDataForTests,
  type TournamentData,
} from "./tournament";
import { advancementProbabilities } from "../engine";
import { normalize, type RawPayloads } from "../data/normalize";
import { PlayersPayloadSchema, SquadsPayloadSchema, RoundsPayloadSchema, validate } from "../data/schema";

function loadData(): TournamentData {
  const load = (name: string) =>
    JSON.parse(readFileSync(new URL(`../data/__fixtures__/${name}.json`, import.meta.url), "utf8"));
  const raw: RawPayloads = {
    players: validate(PlayersPayloadSchema, load("players"), "players.json"),
    squads: validate(SquadsPayloadSchema, load("squads"), "squads.json"),
    rounds: validate(RoundsPayloadSchema, load("rounds"), "rounds.json"),
  };
  const snapshot = normalize(raw, "2026-06-24T00:00:00Z");
  const report = advancementProbabilities(snapshot, { trials: 500, seed: 1 });
  return { snapshot, report, computedAt: 0 };
}

describe("tournament data provider caching", () => {
  beforeEach(() => __resetTournamentDataForTests());

  it("computes once and serves from cache within the TTL", async () => {
    let calls = 0;
    const loader = async () => {
      calls++;
      return loadData();
    };

    await getTournamentData({ loader, now: 1000, ttlMs: 60_000 });
    await getTournamentData({ loader, now: 1000 + 59_000, ttlMs: 60_000 });

    expect(calls).toBe(1);
  });

  it("recomputes after the TTL expires", async () => {
    let calls = 0;
    const loader = async () => {
      calls++;
      return loadData();
    };

    await getTournamentData({ loader, now: 1000, ttlMs: 60_000 });
    await getTournamentData({ loader, now: 1000 + 61_000, ttlMs: 60_000 });

    expect(calls).toBe(2);
  });
});
