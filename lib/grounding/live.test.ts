import { describe, it, expect } from "vitest";
import { buildGroupSituation } from "./situation";
import { team, done, liveMatch, snapshot } from "../engine/testutil";

const teams = [team(1, "AAA"), team(2, "BBB"), team(3, "CCC"), team(4, "DDD")];

describe("live-aware group situation", () => {
  // CCC is currently beating DDD 2–0 (live); AAA already beat BBB.
  const snap = snapshot(teams, [done(1, 2, 1, 0), liveMatch(3, 4, 2, 0)]);

  it("default (non-provisional) does not fold the live score", () => {
    const g = buildGroupSituation(snap, "a");
    expect(g.provisional).toBe(false);
    expect(g.teams.find((t) => t.teamId === 3)!.points).toBe(0); // live not counted
    // live fixtures are still surfaced for indicators even in default mode
    expect(g.liveFixtures).toHaveLength(1);
    expect(g.liveFixtures[0]).toMatchObject({ homeAbbr: "CCC", awayAbbr: "DDD", homeScore: 2, awayScore: 0 });
  });

  it("provisional mode folds the live score into the standings", () => {
    const g = buildGroupSituation(snap, "a", undefined, { provisional: true });
    expect(g.provisional).toBe(true);
    expect(g.teams.find((t) => t.teamId === 3)!.points).toBe(3); // live win folded in
    expect(g.narration.startsWith("As it stands —")).toBe(true);
  });
});
