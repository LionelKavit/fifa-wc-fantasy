import { describe, it, expect } from "vitest";
import { narrateTeam, narrateGroup } from "./narrate";
import type { TeamFacts, TeamSituation, GroupFacts } from "./situation";
import type { OwnMatchConditions, OutcomeEffect } from "../engine";

function facts(partial: Partial<TeamFacts> = {}): TeamFacts {
  return {
    teamId: 1,
    abbr: "AAA",
    name: "Ateam",
    groupId: "a",
    rank: 2,
    points: 4,
    goalDifference: 1,
    played: 2,
    topTwo: "alive",
    advancement: "contention",
    thirdPlaceEligible: false,
    ownMatch: null,
    advancementProbability: null,
    conditionalProbability: null,
    ...partial,
  };
}

function ownMatch(win: OutcomeEffect, draw: OutcomeEffect, loss: OutcomeEffect): OwnMatchConditions {
  return { fixtureId: 1, opponentId: 2, opponentAbbr: "BBB", win, draw, loss };
}

describe("narrateTeam", () => {
  it("reads a clinched team as secured, with no probability talk", () => {
    const n = narrateTeam(facts({ advancement: "clinched", topTwo: "clinched" }));
    expect(n).toContain("secured");
    expect(n).not.toContain("%");
  });

  it("states a guaranteeing win for an alive team that needs to win", () => {
    const n = narrateTeam(facts({ ownMatch: ownMatch("clinch", "depends", "eliminated") }));
    expect(n).toContain("win over BBB guarantees");
    expect(n).toContain("draw might be enough");
  });

  it("phrases avoid-defeat when a win or draw both clinch", () => {
    const n = narrateTeam(facts({ ownMatch: ownMatch("clinch", "clinch", "depends") }));
    expect(n).toContain("avoiding defeat against BBB");
  });

  it("captures margin sensitivity when even a win may not be enough", () => {
    const n = narrateTeam(facts({ ownMatch: ownMatch("depends", "eliminated", "eliminated") }));
    expect(n).toContain("may not be enough");
  });

  it("phrases a third-place race as deferred and uncertain", () => {
    const n = narrateTeam(
      facts({ advancement: "thirdPlaceRace", topTwo: "eliminated", thirdPlaceEligible: true, advancementProbability: 0.12 }),
    );
    expect(n).toContain("third-placed");
    expect(n).toContain("12%");
  });

  it("reads an eliminated team as out", () => {
    const n = narrateTeam(facts({ advancement: "eliminated", topTwo: "eliminated" }));
    expect(n).toContain("out");
    expect(n).not.toContain("%");
  });
});

describe("narration facts map to structured fields (no prose-only claims)", () => {
  // Extract every integer that appears immediately before a % sign.
  const percentsIn = (s: string) => [...s.matchAll(/(\d+)%/g)].map((m) => Number(m[1]));

  it("a clinched/eliminated team narration contains no percentages", () => {
    expect(percentsIn(narrateTeam(facts({ advancement: "clinched" })))).toEqual([]);
    expect(percentsIn(narrateTeam(facts({ advancement: "eliminated" })))).toEqual([]);
  });

  it("every percentage in a contention narration comes from a probability field", () => {
    const f = facts({
      ownMatch: ownMatch("clinch", "depends", "eliminated"),
      advancementProbability: 0.5,
      conditionalProbability: { win: 1, draw: 0.6, loss: 0.1 },
    });
    const allowed = new Set([50, 100, 60, 10]); // round(0.5), round(1), round(0.6), round(0.1)
    for (const p of percentsIn(narrateTeam(f))) expect(allowed.has(p)).toBe(true);
  });

  it("the opponent abbreviation only appears when ownMatch is present", () => {
    expect(narrateTeam(facts({ ownMatch: null, advancement: "contention" }))).not.toContain("BBB");
    expect(narrateTeam(facts({ ownMatch: ownMatch("clinch", "clinch", "depends") }))).toContain("BBB");
  });
});

describe("narrateGroup", () => {
  const team = (partial: Partial<TeamSituation>): TeamSituation => ({
    ...facts(partial),
    narration: "",
  });

  it("summarizes clinched, contending, and eliminated teams", () => {
    const g: GroupFacts = {
      groupId: "f",
      table: [],
      teams: [
        team({ teamId: 1, abbr: "NED", advancement: "clinched" }),
        team({ teamId: 2, abbr: "JPN", advancement: "contention" }),
        team({ teamId: 3, abbr: "SWE", advancement: "thirdPlaceRace" }),
        team({ teamId: 4, abbr: "TUN", advancement: "eliminated" }),
      ],
      decidedPlaces: { qualified: [1], eliminated: [4] },
    };
    const n = narrateGroup(g);
    expect(n).toContain("Group F");
    expect(n).toContain("NED");
    expect(n).toContain("secured");
    expect(n).toContain("TUN");
    expect(n).toContain("out");
  });

  it("calls a fresh group wide open", () => {
    const g: GroupFacts = {
      groupId: "a",
      table: [],
      teams: [1, 2, 3, 4].map((id) => team({ teamId: id, abbr: `T${id}`, advancement: "contention" })),
      decidedPlaces: { qualified: [], eliminated: [] },
    };
    // all contending → no clinched/eliminated, but contending present
    expect(narrateGroup(g)).toContain("still fighting");
  });
});
