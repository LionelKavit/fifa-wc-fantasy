// Fetch + short-TTL cache for the three public endpoints. Live scores change
// mid-match, so the TTL is short. Failed responses are never cached.

import {
  PlayersPayloadSchema,
  SquadsPayloadSchema,
  RoundsPayloadSchema,
  validate,
  type RawPlayer,
  type RawSquad,
  type RawRound,
} from "./schema";

const DEFAULT_BASE_URL = "https://play.fifa.com/json/fantasy";
export const DEFAULT_TTL_MS = 60_000;

/** Thrown when an endpoint responds with a non-200 status. */
export class FetchError extends Error {
  constructor(
    public endpoint: string,
    public status: number,
  ) {
    super(`Fetch failed for ${endpoint}: HTTP ${status}`);
    this.name = "FetchError";
  }
}

export interface FetchOptions {
  ttlMs?: number;
  baseUrl?: string;
  /** Injectable for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable clock (ms) for deterministic TTL tests. Defaults to Date.now. */
  now?: () => number;
}

interface CacheEntry {
  data: unknown;
  expires: number;
}

const cache = new Map<string, CacheEntry>();

/** Clear the in-memory cache (used between tests and to force a refresh). */
export function clearCache(): void {
  cache.clear();
}

async function fetchRaw(name: string, opts: FetchOptions): Promise<unknown> {
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
  const now = opts.now ? opts.now() : Date.now();
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
  const doFetch = opts.fetchImpl ?? fetch;

  const cacheKey = `${baseUrl}/${name}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > now) return hit.data;

  const res = await doFetch(`${baseUrl}/${name}.json`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new FetchError(`${name}.json`, res.status);

  const data = (await res.json()) as unknown;
  cache.set(cacheKey, { data, expires: now + ttl });
  return data;
}

export async function fetchPlayers(opts: FetchOptions = {}): Promise<RawPlayer[]> {
  return validate(PlayersPayloadSchema, await fetchRaw("players", opts), "players.json");
}

export async function fetchSquads(opts: FetchOptions = {}): Promise<RawSquad[]> {
  return validate(SquadsPayloadSchema, await fetchRaw("squads", opts), "squads.json");
}

export async function fetchRounds(opts: FetchOptions = {}): Promise<RawRound[]> {
  return validate(RoundsPayloadSchema, await fetchRaw("rounds", opts), "rounds.json");
}
