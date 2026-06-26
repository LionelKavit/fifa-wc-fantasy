import { describe, it, expect } from "vitest";
import type { TournamentSnapshot, Team, Fixture } from "../data/models";
import { buildBracket } from "./bracket";
import {
  emptyPrediction,
  predictedParticipants,
  pick,
  clear,
  completeness,
  derivePrediction,
  isPredictionLocked,
} from "./prediction";
import type { Prediction } from "./types";

const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] as const;
const groupTeamId = (gi: number, p: number): number => gi * 4 + p;

let seq = 11000;
function done(homeId: number, awayId: number, hs: number, as: number, stage: Fixture["stage"] = "GROUP"): Fixture {
  return { id: seq++, roundId: 1, stage, status: "complete", kickoff: "2026-06-12T00:00:00Z", homeTeamId: homeId, awayTeamId: awayId, homeScore: hs, awayScore: as, venue: null };
}
function finalGroupFixtures(gi: number): Fixture[] {
  const t = (p: number) => groupTeamId(gi, p);
  return [done(t(1), t(2), 1, 0), done(t(1), t(3), 1, 0), done(t(1), t(4), 1, 0), done(t(2), t(3), 1, 0), done(t(2), t(4), 1, 0), done(t(3), t(4), 1, 0)];
}
function snapshotWith(extra: Fixture[] = []): TournamentSnapshot {
  const teams: Team[] = [];
  LETTERS.forEach((letter, gi) => {
    for (let p = 1; p <= 4; p++) teams.push({ id: groupTeamId(gi, p), name: `${letter.toUpperCase()}${p}`, abbr: `${letter.toUpperCase()}${p}`, group: letter, isEliminated: false });
  });
  const groups = LETTERS.map((id) => ({ id, teams: teams.filter((t) => t.group === id) }));
  const fixtures: Fixture[] = [];
  for (let gi = 0; gi < 12; gi++) fixtures.push(...finalGroupFixtures(gi));
  fixtures.push(...extra);
  return { fetchedAt: "2026-06-27T00:00:00Z", teams, groups, players: [], rounds: [], fixtures };
}

/** Editable: groups final, no knockout fixture has kicked off. */
const editable = snapshotWith();
/** Locked: a knockout fixture has already kicked off. */
const locked = snapshotWith([
  { id: 99001, roundId: 5, stage: "R32", status: "scheduled", kickoff: "2026-06-20T00:00:00Z", homeTeamId: 0, awayTeamId: 0, homeScore: null, awayScore: null, venue: null },
]);
const bracket = buildBracket(editable);

/** Fill every match by always picking the first listed participant. */
function fillAll(snap: TournamentSnapshot): Prediction {
  let p = emptyPrediction();
  for (const m of bracket.matches) {
    const [a] = predictedParticipants(bracket, p, m.id);
    if (a !== null) p = pick(snap, bracket, p, m.id, a);
  }
  return p;
}

describe("prediction model — representation", () => {
  it("records a pick of a valid participant", () => {
    const [a, b] = predictedParticipants(bracket, emptyPrediction(), "M75");
    const p = pick(editable, bracket, emptyPrediction(), "M75", a!);
    expect(p.get("M75")).toBe(a);
    expect([a, b]).toContain(p.get("M75"));
  });

  it("reports unpicked matches as unpicked", () => {
    expect(emptyPrediction().has("M75")).toBe(false);
  });

  it("rejects picking a non-participant", () => {
    const p = pick(editable, bracket, emptyPrediction(), "M75", 9999);
    expect(p.has("M75")).toBe(false);
  });
});

describe("prediction model — propagation", () => {
  it("derives a later match's participants from its feeder picks", () => {
    const [w73] = predictedParticipants(bracket, emptyPrediction(), "M73");
    const [w75] = predictedParticipants(bracket, emptyPrediction(), "M75");
    let p = pick(editable, bracket, emptyPrediction(), "M73", w73!);
    p = pick(editable, bracket, p, "M75", w75!);
    expect(predictedParticipants(bracket, p, "M90")).toEqual([w73, w75]);
  });

  it("cascade-clears a later pick when an earlier pick changes", () => {
    const parts73 = predictedParticipants(bracket, emptyPrediction(), "M73");
    const parts75 = predictedParticipants(bracket, emptyPrediction(), "M75");
    let p = pick(editable, bracket, emptyPrediction(), "M73", parts73[0]!);
    p = pick(editable, bracket, p, "M75", parts75[0]!);
    p = pick(editable, bracket, p, "M90", parts75[0]!); // advance the M75 winner into M90
    expect(p.get("M90")).toBe(parts75[0]);
    // Change M75 to the other finalist → M90's pick (old M75 winner) is now invalid.
    p = pick(editable, bracket, p, "M75", parts75[1]!);
    expect(p.has("M90")).toBe(false);
  });
});

describe("prediction model — completeness", () => {
  it("is empty with no picks and partial with some", () => {
    expect(completeness(bracket, emptyPrediction())).toBe("empty");
    const [a] = predictedParticipants(bracket, emptyPrediction(), "M73");
    const p = pick(editable, bracket, emptyPrediction(), "M73", a!);
    expect(completeness(bracket, p)).toBe("partial");
  });

  it("is complete with one champion once every match is picked", () => {
    const p = fillAll(editable);
    expect(completeness(bracket, p)).toBe("complete");
    const view = derivePrediction(bracket, p);
    expect(view.champion).not.toBeNull();
    expect(view.champion).toBe(view.winners.get("M104"));
    expect(view.survivorsByStage.R32).toHaveLength(16);
    expect(view.survivorsByStage.F).toHaveLength(1);
  });
});

describe("prediction model — locking", () => {
  it("is editable before the first knockout kickoff", () => {
    expect(isPredictionLocked(editable)).toBe(false);
    const [a] = predictedParticipants(bracket, emptyPrediction(), "M73");
    expect(pick(editable, bracket, emptyPrediction(), "M73", a!).has("M73")).toBe(true);
  });

  it("rejects edits once locked, leaving the prediction unchanged", () => {
    expect(isPredictionLocked(locked)).toBe(true);
    const [a] = predictedParticipants(bracket, emptyPrediction(), "M73");
    const before = pick(editable, bracket, emptyPrediction(), "M73", a!);
    const after = pick(locked, bracket, before, "M75", predictedParticipants(bracket, before, "M75")[0]!);
    expect(after).toBe(before); // unchanged reference: edit rejected
    expect(clear(locked, bracket, before, "M73")).toBe(before);
  });
});

describe("prediction model — purity", () => {
  it("does not mutate the input prediction", () => {
    const original = emptyPrediction();
    const [a] = predictedParticipants(bracket, original, "M73");
    const next = pick(editable, bracket, original, "M73", a!);
    expect(original.size).toBe(0);
    expect(next).not.toBe(original);
    expect(next.get("M73")).toBe(a);
  });
});
