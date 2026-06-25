import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchSquads, clearCache, FetchError, DEFAULT_TTL_MS } from "./endpoints";

const squads = [
  { id: 1, name: "Algeria", abbr: "ALG", group: "j", isEliminated: false },
];

function okResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

const opts = (extra: Record<string, unknown>) => ({
  baseUrl: "https://test.local",
  ...extra,
});

describe("fetch + cache", () => {
  beforeEach(() => clearCache());

  it("serves from cache within TTL without a second network call", async () => {
    const fetchImpl = vi.fn(async () => okResponse(squads)) as unknown as typeof fetch;
    let clock = 1_000;
    const now = () => clock;

    const first = await fetchSquads(opts({ fetchImpl, now }));
    clock += DEFAULT_TTL_MS - 1; // still within TTL
    const second = await fetchSquads(opts({ fetchImpl, now }));

    expect(first[0]!.abbr).toBe("ALG");
    expect(second[0]!.abbr).toBe("ALG");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("re-fetches after the TTL expires", async () => {
    const fetchImpl = vi.fn(async () => okResponse(squads)) as unknown as typeof fetch;
    let clock = 1_000;
    const now = () => clock;

    await fetchSquads(opts({ fetchImpl, now }));
    clock += DEFAULT_TTL_MS + 1; // past TTL
    await fetchSquads(opts({ fetchImpl, now }));

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws a typed FetchError on non-200 and does not cache the failure", async () => {
    const failing = vi.fn(async () => ({ ok: false, status: 503 }) as Response) as unknown as typeof fetch;
    await expect(fetchSquads(opts({ fetchImpl: failing }))).rejects.toBeInstanceOf(FetchError);

    // A subsequent successful fetch must hit the network (failure was not cached).
    const ok = vi.fn(async () => okResponse(squads)) as unknown as typeof fetch;
    const result = await fetchSquads(opts({ fetchImpl: ok }));
    expect(result[0]!.abbr).toBe("ALG");
    expect(ok).toHaveBeenCalledTimes(1);
  });
});
