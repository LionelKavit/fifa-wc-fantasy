// Server-only cached tournament data provider. Loads the snapshot and computes
// the advancement report once, caching both with a short TTL so the ~50k-trial
// Monte Carlo never runs on the request hot path. Concurrent refreshes are
// coalesced so a cold cache triggers at most one computation.

import { loadTournamentSnapshot, type TournamentSnapshot } from "../data";
import { advancementProbabilities, hasLiveFixtures, type AdvancementReport } from "../engine";
import { buildOutcomeModel } from "./model";

export interface TournamentData {
  snapshot: TournamentSnapshot;
  report: AdvancementReport;
  computedAt: number;
  /** True when any fixture is currently in progress. */
  live: boolean;
}

const DEFAULT_TTL_MS = 60_000;
/** Shorter refresh cadence while matches are live, so scores flow through fast. */
const LIVE_TTL_MS = 12_000;
const TRIALS = 50_000;
const SEED = 1;

let cache: TournamentData | null = null;
let inflight: Promise<TournamentData> | null = null;

async function computeFresh(): Promise<TournamentData> {
  const snapshot = await loadTournamentSnapshot();
  const model = buildOutcomeModel(snapshot);
  const report = advancementProbabilities(snapshot, { trials: TRIALS, seed: SEED, model });
  return { snapshot, report, computedAt: 0, live: hasLiveFixtures(snapshot) };
}

export interface ProviderOptions {
  now?: number;
  ttlMs?: number;
  /** Injectable for tests; defaults to fetching live + simulating. */
  loader?: () => Promise<TournamentData>;
}

/** Get the current tournament data, served from cache within the TTL. The TTL is
 * shortened automatically while matches are live so live scores refresh quickly. */
export async function getTournamentData(opts: ProviderOptions = {}): Promise<TournamentData> {
  const now = opts.now ?? Date.now();
  const ttl = opts.ttlMs ?? (cache?.live ? LIVE_TTL_MS : DEFAULT_TTL_MS);

  if (cache && now - cache.computedAt < ttl) return cache;
  if (inflight) return inflight;

  const loader = opts.loader ?? computeFresh;
  inflight = loader()
    .then((data) => {
      cache = { ...data, computedAt: now };
      inflight = null;
      return cache;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });
  return inflight;
}

/** Test seam: seed the cache so handlers don't hit the network. */
export function __setTournamentDataForTests(data: TournamentData): void {
  cache = { ...data, computedAt: data.computedAt || Date.now() };
  inflight = null;
}

/** Test seam: clear the cache. */
export function __resetTournamentDataForTests(): void {
  cache = null;
  inflight = null;
}
