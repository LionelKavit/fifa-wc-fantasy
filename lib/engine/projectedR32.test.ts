import { describe, it, expect } from "vitest";
import type { TournamentSnapshot, Team, Fixture } from "../data/models";
import { advancementProbabilities } from "./probability";
import { buildBracket, projectR32, type FinishProbs } from "./bracket";

const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] as const;
const groupTeamId = (gi: number, p: number): number => gi * 4 + p;

let seq = 30000;
function done(h: number, a: number, hs: number, as: number): Fixture {
  return { id: seq++, roundId: 1, stage: "GROUP", status: "complete", kickoff: "2026-06-12T00:00:00Z", homeTeamId: h, awayTeamId: a, homeScore: hs, awayScore: as, venue: null };
}
function todo(h: number, a: number): Fixture {
  return { id: seq++, roundId: 3, stage: "GROUP", status: "scheduled", kickoff: "2026-06-24T00:00:00Z", homeTeamId: h, awayTeamId: a, homeScore: null, awayScore: null, venue: null };
}
/** Round-robin for one group, either all scheduled or all played (p1>p2>p3>p4). */
function group(gi: number, played: boolean): Fixture[] {
  const t = (p: number) => groupTeamId(gi, p);
  const pairs: [number, number][] = [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]];
  return pairs.map(([x, y]) => (played ? done(t(x), t(y), 1, 0) : todo(t(x), t(y))));
}
function snapshot(finalGroups: number[] = []): TournamentSnapshot {
  const teams: Team[] = [];
  LETTERS.forEach((letter, gi) => {
    for (let p = 1; p <= 4; p++) teams.push({ id: groupTeamId(gi, p), name: `${letter.toUpperCase()}${p}`, abbr: `${letter.toUpperCase()}${p}`, group: letter, isEliminated: false });
  });
  const groups = LETTERS.map((id) => ({ id, teams: teams.filter((t) => t.group === id) }));
  const fixtures: Fixture[] = [];
  for (let gi = 0; gi < 12; gi++) fixtures.push(...group(gi, finalGroups.includes(gi)));
  return { fetchedAt: "2026-06-24T00:00:00Z", teams, groups, players: [], rounds: [], fixtures };
}

const finishMap = (snap: TournamentSnapshot): FinishProbs =>
  new Map(advancementProbabilities(snap, { trials: 800, seed: 3 }).teams.map((t) => [t.teamId, t.finish]));

describe("finishing-position probabilities", () => {
  it("reports per-team finish probabilities that sum to 1 per position in each group", () => {
    const report = advancementProbabilities(snapshot(), { trials: 800, seed: 3 });
    for (const letter of LETTERS) {
      const group = report.teams.filter((t) => t.groupId === letter);
      for (const key of ["first", "second", "third"] as const) {
        const sum = group.reduce((s, t) => s + t.finish[key], 0);
        expect(sum).toBeCloseTo(1, 5);
      }
      for (const t of group) for (const key of ["first", "second", "third"] as const) {
        expect(t.finish[key]).toBeGreaterThanOrEqual(0);
        expect(t.finish[key]).toBeLessThanOrEqual(1);
      }
    }
  });

  it("reports certainties for a finalized group", () => {
    const report = advancementProbabilities(snapshot([0]), { trials: 400, seed: 3 });
    const a = report.teams.filter((t) => t.groupId === "a");
    expect(a.find((t) => t.teamId === groupTeamId(0, 1))!.finish.first).toBe(1); // A1 won the group
    expect(a.find((t) => t.teamId === groupTeamId(0, 2))!.finish.second).toBe(1);
  });
});

describe("projected R32 fill", () => {
  it("fills undetermined R32 slots with projected teams when projection is supplied", () => {
    const snap = snapshot(); // no groups final → all R32 placeholders without projection
    const plain = buildBracket(snap);
    for (const m of plain.byStage.R32) for (const s of m.slots) expect(s.team).toBeNull();

    const projection = projectR32(snap, finishMap(snap));
    const projected = buildBracket(snap, { projection });
    for (const m of projected.byStage.R32) {
      for (const s of m.slots) {
        expect(s.team, `unfilled: ${s.label}`).not.toBeNull();
        expect(s.projected).toBe(true);
      }
    }
  });

  it("projects a coherent, distinct winner and runner-up per group", () => {
    const snap = snapshot();
    const projection = projectR32(snap, finishMap(snap));
    for (const letter of LETTERS) {
      expect(projection.winner.get(letter)).not.toBe(projection.runnerUp.get(letter));
    }
    expect(projection.thirdByMatch.size).toBe(8);
  });

  it("does not flag real results as projected, and only projects the gaps", () => {
    const snap = snapshot([5]); // group F (gi=5) is final; the rest are not
    const projection = projectR32(snap, finishMap(snap));
    const bracket = buildBracket(snap, { projection });
    // Match 75 = Winner F vs Runner-up C. Winner F is real (group F final) → not projected.
    const m75 = bracket.matches.find((m) => m.id === "M75")!;
    const winnerFslot = m75.slots[0]!;
    expect(winnerFslot.team).toMatchObject({ teamId: groupTeamId(5, 1) });
    expect(winnerFslot.projected).toBeFalsy();
  });
});
