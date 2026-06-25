// Live smoke test — hits the real FIFA endpoints. Set SKIP_LIVE=1 to skip
// (e.g. offline CI). Structural assertions only; values change during matches.
import { describe, it, expect } from "vitest";
import { loadTournamentSnapshot, clearCache } from "./index";

const live = process.env.SKIP_LIVE ? describe.skip : describe;

live("loadTournamentSnapshot (live)", () => {
  it("resolves a structurally valid snapshot from the real endpoints", async () => {
    clearCache();
    const snap = await loadTournamentSnapshot();
    expect(snap.teams).toHaveLength(48);
    expect(snap.groups).toHaveLength(12);
    for (const g of snap.groups) expect(g.teams).toHaveLength(4);
    expect(snap.players.length).toBeGreaterThan(1000);
    expect(snap.fixtures.filter((f) => f.stage === "GROUP").length).toBe(72);
    expect(typeof snap.fetchedAt).toBe("string");
  }, 30_000);
});
