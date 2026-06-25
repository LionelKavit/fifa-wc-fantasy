import { describe, it, expect } from "vitest";
import { hasLiveFixtures, liveFixturesForGroup } from "./live";
import { advancementProbabilities } from "./probability";
import { team, done, todo, liveMatch, snapshot } from "./testutil";

// Group: T1 & T2 already qualified-ish, T3 & T4 fight; T3 has a remaining match.
const teams = [team(1, "AAA"), team(2, "BBB"), team(3, "CCC"), team(4, "DDD")];

describe("live detection", () => {
  it("detects and lists in-progress fixtures by group", () => {
    const snap = snapshot(teams, [done(1, 2, 1, 0), liveMatch(3, 4, 2, 0), todo(1, 3)]);
    expect(hasLiveFixtures(snap)).toBe(true);
    const live = liveFixturesForGroup(snap, "a");
    expect(live).toHaveLength(1);
    expect(live[0]).toMatchObject({ homeAbbr: "CCC", awayAbbr: "DDD", homeScore: 2, awayScore: 0 });
  });

  it("reports no live fixtures when none are in progress", () => {
    expect(hasLiveFixtures(snapshot(teams, [done(1, 2, 1, 0), todo(3, 4)]))).toBe(false);
  });
});

describe("live-conditioned advancement (monotonicity)", () => {
  // Pre-final: T1=T2=4pts; T3=T4=1pt. Remaining: T3 vs T4 (the contested one) + T1 vs T2.
  const completed = [done(1, 3, 1, 0), done(1, 4, 0, 0), done(2, 4, 1, 0), done(2, 3, 0, 0)];

  it("a team currently leading a live match has probability >= the not-started case", () => {
    const opts = { trials: 4000, seed: 1 };

    // T3's match not started yet.
    const notStarted = snapshot(teams, [...completed, todo(3, 4), todo(1, 2)]);
    // T3 currently leading its match 3–0.
    const leadingLive = snapshot(teams, [...completed, liveMatch(3, 4, 3, 0), todo(1, 2)]);

    const probNotStarted = advancementProbabilities(notStarted, opts).teams.find((t) => t.teamId === 3)!.probability;
    const probLeading = advancementProbabilities(leadingLive, opts).teams.find((t) => t.teamId === 3)!.probability;

    expect(probLeading).toBeGreaterThanOrEqual(probNotStarted);
    // A clear 3–0 lead should strictly improve a contested team's chances.
    expect(probLeading).toBeGreaterThan(probNotStarted);
  });

  it("a team currently losing a live match has probability <= the not-started case", () => {
    const opts = { trials: 4000, seed: 1 };
    const notStarted = snapshot(teams, [...completed, todo(3, 4), todo(1, 2)]);
    const trailingLive = snapshot(teams, [...completed, liveMatch(3, 4, 0, 3), todo(1, 2)]);

    const probNotStarted = advancementProbabilities(notStarted, opts).teams.find((t) => t.teamId === 3)!.probability;
    const probTrailing = advancementProbabilities(trailingLive, opts).teams.find((t) => t.teamId === 3)!.probability;

    expect(probTrailing).toBeLessThanOrEqual(probNotStarted);
  });
});
