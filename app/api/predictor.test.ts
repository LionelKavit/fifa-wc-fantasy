import { describe, it, expect, beforeEach } from "vitest";
import { GET as getBracket } from "./bracket/route";
import { POST as postEvaluate } from "./predictor/evaluate/route";
import { __setTournamentDataForTests, type TournamentData } from "../../lib/server/tournament";
import { __resetBracketCacheForTests } from "../../lib/server/predictor";
import { advancementProbabilities } from "../../lib/engine";
import type { TournamentSnapshot, Team, Fixture } from "../../lib/data/models";

const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] as const;
const groupTeamId = (gi: number, p: number): number => gi * 4 + p;

let seq = 20000;
const done = (h: number, a: number, hs: number, as: number): Fixture => ({
  id: seq++, roundId: 1, stage: "GROUP", status: "complete", kickoff: "2026-06-12T00:00:00Z",
  homeTeamId: h, awayTeamId: a, homeScore: hs, awayScore: as, venue: null,
});
function finalGroup(gi: number): Fixture[] {
  const t = (p: number) => groupTeamId(gi, p);
  return [done(t(1), t(2), 1, 0), done(t(1), t(3), 1, 0), done(t(1), t(4), 1, 0), done(t(2), t(3), 1, 0), done(t(2), t(4), 1, 0), done(t(3), t(4), 1, 0)];
}
function allFinalSnapshot(): TournamentSnapshot {
  const teams: Team[] = [];
  LETTERS.forEach((letter, gi) => {
    for (let p = 1; p <= 4; p++) teams.push({ id: groupTeamId(gi, p), name: `${letter.toUpperCase()}${p}`, abbr: `${letter.toUpperCase()}${p}`, group: letter, isEliminated: false });
  });
  const groups = LETTERS.map((id) => ({ id, teams: teams.filter((t) => t.group === id) }));
  const fixtures: Fixture[] = [];
  for (let gi = 0; gi < 12; gi++) fixtures.push(...finalGroup(gi));
  return { fetchedAt: "2026-06-27T00:00:00Z", teams, groups, players: [], rounds: [], fixtures };
}

function seed(): void {
  const snapshot = allFinalSnapshot();
  const report = advancementProbabilities(snapshot, { trials: 200, seed: 1 });
  const data: TournamentData = { snapshot, report, computedAt: Date.now(), live: false };
  __setTournamentDataForTests(data);
  __resetBracketCacheForTests();
}

const evalRequest = (picks: [string, number][]): Request =>
  new Request("http://localhost/api/predictor/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ picks }),
  });

beforeEach(seed);

describe("GET /api/bracket", () => {
  it("returns the full bracket with concrete R32 teams and lock state", async () => {
    const json = await (await getBracket()).json();
    expect(json.matches).toHaveLength(31);
    expect(json.locked).toBe(false);
    const r32 = json.matches.filter((m: { stage: string }) => m.stage === "R32");
    expect(r32).toHaveLength(16);
    for (const m of r32) for (const s of m.slots) expect(s.team).not.toBeNull();
    expect(json.matches.find((m: { id: string }) => m.id === "M104").stage).toBe("F");
  }, 20000);
});

describe("POST /api/predictor/evaluate", () => {
  it("scores and compares a valid prediction", async () => {
    // M75 = winner F (F1=21) vs runner-up C (C2=10).
    const res = await postEvaluate(evalRequest([["M75", groupTeamId(5, 1)]]));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.score.picks).toHaveLength(1);
    expect(json.comparison.picks[0].matchId).toBe("M75");
    expect(json.comparison.survival).toHaveProperty("R32");
    expect(json.comparison.headlineSurvival).toBeGreaterThanOrEqual(0);
  }, 20000);

  it("rejects a pick that is not a participant", async () => {
    const res = await postEvaluate(evalRequest([["M75", 9999]]));
    expect(res.status).toBe(400);
  }, 20000);

  it("rejects a malformed body", async () => {
    const res = await postEvaluate(
      new Request("http://localhost/api/predictor/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nope: true }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
