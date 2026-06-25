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
  return { snapshot, report, computedAt: 0, live: false };
}

function loadDataLive(): TournamentData {
  return { ...loadData(), live: true };
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

  it("uses a short cadence while live and the normal cadence when idle", async () => {
    // Live: cached for ~12s, recompute after.
    let liveCalls = 0;
    const liveLoader = async () => {
      liveCalls++;
      return loadDataLive();
    };
    await getTournamentData({ loader: liveLoader, now: 1000 }); // compute (live)
    await getTournamentData({ loader: liveLoader, now: 1000 + 11_000 }); // within 12s → cached
    await getTournamentData({ loader: liveLoader, now: 1000 + 13_000 }); // past 12s → recompute
    expect(liveCalls).toBe(2);

    __resetTournamentDataForTests();

    // Idle: cached for ~60s.
    let idleCalls = 0;
    const idleLoader = async () => {
      idleCalls++;
      return loadData();
    };
    await getTournamentData({ loader: idleLoader, now: 1000 }); // compute (idle)
    await getTournamentData({ loader: idleLoader, now: 1000 + 13_000 }); // within 60s → cached
    expect(idleCalls).toBe(1);
  });
});
