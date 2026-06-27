import { describe, it, expect } from "vitest";
import type { TournamentSnapshot, Team, Fixture } from "../data/models";
import { advancementProbabilities, projectR32, type FinishProbs, type Prediction } from "../engine";
import { executeTool, type ScoutContext } from "./tools";

const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] as const;
const groupTeamId = (gi: number, p: number): number => gi * 4 + p;

let seq = 40000;
const done = (h: number, a: number, hs: number, as: number): Fixture => ({
  id: seq++, roundId: 1, stage: "GROUP", status: "complete", kickoff: "2026-06-12T00:00:00Z",
  homeTeamId: h, awayTeamId: a, homeScore: hs, awayScore: as, venue: null,
});
function finalGroup(gi: number): Fixture[] {
  const t = (p: number) => groupTeamId(gi, p);
  return [done(t(1), t(2), 1, 0), done(t(1), t(3), 1, 0), done(t(1), t(4), 1, 0), done(t(2), t(3), 1, 0), done(t(2), t(4), 1, 0), done(t(3), t(4), 1, 0)];
}
function snapshot(): TournamentSnapshot {
  const teams: Team[] = [];
  LETTERS.forEach((letter, gi) => {
    for (let p = 1; p <= 4; p++) teams.push({ id: groupTeamId(gi, p), name: `${letter.toUpperCase()}${p}`, abbr: `${letter.toUpperCase()}${p}`, group: letter, isEliminated: false });
  });
  const groups = LETTERS.map((id) => ({ id, teams: teams.filter((t) => t.group === id) }));
  const fixtures: Fixture[] = [];
  for (let gi = 0; gi < 12; gi++) fixtures.push(...finalGroup(gi));
  return { fetchedAt: "2026-06-27T00:00:00Z", teams, groups, players: [], rounds: [], fixtures };
}

function context(prediction: Prediction | null): ScoutContext {
  const snap = snapshot();
  const report = advancementProbabilities(snap, { trials: 300, seed: 1 });
  const finish: FinishProbs = new Map(report.teams.map((t) => [t.teamId, t.finish]));
  const ratings = new Map(snap.teams.map((t) => [t.id, 1500 + t.id])); // distinct, ascending
  // Higher team id ⇒ favored; a simple monotone head-to-head for compare_teams.
  const matchupWinProb = (a: number, b: number) => (a === b ? 0.5 : a > b ? 0.6 : 0.4);
  return { snapshot: snap, report, prediction, projection: projectR32(snap, finish), ratings, matchupWinProb, poolSize: 10, _eval: null };
}

const parse = (r: { output: string }) => JSON.parse(r.output);

describe("scout bracket tools — evaluate_bracket", () => {
  it("returns a grounded evaluation when picks are present", () => {
    // M75 = winner F (F1=21) vs runner-up C (C2=10).
    const pred: Prediction = new Map([["M75", groupTeamId(5, 1)]]);
    const res = executeTool("evaluate_bracket", {}, context(pred));
    const out = parse(res);
    expect(out.hasBracket).toBe(true);
    expect(typeof out.projectedScore).toBe("number");
    expect(out.stillAlivePct).toMatch(/%$/);
    expect(out.picks).toHaveLength(1);
    expect(out.picks[0].match).toBe("M75");
  }, 20000);

  it("reports no bracket when picks are absent", () => {
    const res = executeTool("evaluate_bracket", {}, context(null));
    expect(parse(res).hasBracket).toBe(false);
  });
});

describe("scout bracket tools — bracket_strategy", () => {
  it("returns a pool-fit verdict and swaps when picks + pool size are present", () => {
    const pred: Prediction = new Map([["M75", groupTeamId(5, 1)], ["M76", groupTeamId(2, 1)]]);
    const out = parse(executeTool("bracket_strategy", {}, context(pred)));
    expect(["too-safe", "balanced", "too-risky"]).toContain(out.verdict);
    expect(Array.isArray(out.swaps)).toBe(true);
    expect(typeof out.summary).toBe("string");
  }, 20000);

  it("asks for pool size when missing", () => {
    const ctx = context(new Map([["M75", groupTeamId(5, 1)]]));
    ctx.poolSize = null;
    expect(parse(executeTool("bracket_strategy", {}, ctx)).needPoolSize).toBe(true);
  }, 20000);

  it("reports no bracket when picks are absent", () => {
    expect(parse(executeTool("bracket_strategy", {}, context(null))).hasBracket).toBe(false);
  });
});

describe("scout bracket tools — compare_teams", () => {
  it("gives a head-to-head probability for two teams", () => {
    const res = executeTool("compare_teams", { teamA: "A1", teamB: "B1" }, context(null));
    const out = parse(res);
    expect(out.teamA).toBe("A1");
    expect(out.teamB).toBe("B1");
    expect(out.headToHead).toMatch(/%/);
  });

  it("handles a single team and an unknown team", () => {
    expect(parse(executeTool("compare_teams", { teamA: "A1" }, context(null))).team).toBe("A1");
    expect(parse(executeTool("compare_teams", { teamA: "Atlantis" }, context(null))).found).toBe(false);
  });
});
