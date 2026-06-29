import { describe, it, expect } from "vitest";
import type { TournamentSnapshot, Team, Fixture } from "../data/models";
import { buildBracket } from "./bracket";
import { emptyPrediction, predictedParticipants, pick } from "./prediction";
import { compareToModel, DEFAULT_UPSET_FACTOR } from "./predictionVsModel";
import type { Prediction } from "./types";

const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] as const;
const groupTeamId = (gi: number, p: number): number => gi * 4 + p;

let seq = 13000;
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

const OPTS = { trials: 4000, seed: 11 };
const snapshot = snapshotWith();
const bracket = buildBracket(snapshot);

/** Build a complete prediction from a chooser(matchId, [a,b]) → teamId. */
function build(snap: TournamentSnapshot, choose: (matchId: string, a: number, b: number) => number): Prediction {
  let p = emptyPrediction();
  for (const m of bracket.matches) {
    const [a, b] = predictedParticipants(bracket, p, m.id);
    if (a !== null && b !== null) p = pick(snap, bracket, p, m.id, choose(m.id, a, b));
  }
  return p;
}

const chalkBracket = compareToModel(snapshot, emptyPrediction(), OPTS).chalk;
const chalkPred = build(snapshot, (id, a, b) => (chalkBracket.get(id) === b ? b : a));
const antiPred = build(snapshot, (id, a, b) => (chalkBracket.get(id) === a ? b : a));

describe("prediction vs model — per-pick probability", () => {
  it("annotates every pick with a probability in [0,1]", () => {
    const cmp = compareToModel(snapshot, chalkPred, OPTS);
    expect(cmp.picks).toHaveLength(31);
    for (const p of cmp.picks) {
      expect(p.modelProb).toBeGreaterThanOrEqual(0);
      expect(p.modelProb).toBeLessThanOrEqual(1);
    }
  });

  it("rates a bold pick lower than the chalk pick for the same match", () => {
    const [a, b] = predictedParticipants(bracket, emptyPrediction(), "M75");
    const fav = chalkBracket.get("M75")!;
    const under = fav === a ? b! : a!;
    const favCmp = compareToModel(snapshot, new Map([["M75", fav]]), OPTS);
    const undCmp = compareToModel(snapshot, new Map([["M75", under]]), OPTS);
    expect(undCmp.picks[0]!.modelProb).toBeLessThanOrEqual(favCmp.picks[0]!.modelProb);
  });
});

describe("prediction vs model — survival", () => {
  it("is monotonic non-increasing across rounds and in [0,1]", () => {
    const cmp = compareToModel(snapshot, chalkPred, OPTS);
    const s = cmp.survival;
    expect(s.R32).toBeGreaterThanOrEqual(s.R16);
    expect(s.R16).toBeGreaterThanOrEqual(s.QF);
    expect(s.QF).toBeGreaterThanOrEqual(s.SF);
    expect(s.SF).toBeGreaterThanOrEqual(s.F);
    expect(s.F).toBe(cmp.headlineSurvival);
    for (const v of Object.values(s)) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(1);
  });

  it("an all-underdog R32 survives less than the chalk bracket", () => {
    const chalk = compareToModel(snapshot, chalkPred, OPTS);
    const anti = compareToModel(snapshot, antiPred, OPTS);
    expect(anti.survival.R32).toBeLessThanOrEqual(chalk.survival.R32);
  });

  it("conditions on already-decided results (as it stands)", () => {
    // Make match 75 a real upset: away side (C2=10) beats home (F1=21).
    const F1 = groupTeamId(5, 1), C2 = groupTeamId(2, 2);
    const live = snapshotWith([done(F1, C2, 0, 2, "R32")]);
    // A prediction that picked F1 to win M75 is already busted → survival 0 from R32 on.
    const predF1 = new Map([["M75", F1]]);
    const cmp = compareToModel(live, predF1, OPTS);
    expect(cmp.survival.R32).toBe(0);
  });
});

describe("prediction vs model — upset bonus", () => {
  it("awards no upset bonus when no pick is correct yet", () => {
    const cmp = compareToModel(snapshot, antiPred, OPTS); // bold picks, but nothing played
    expect(cmp.upsetBonusCurrent).toBe(0);
    expect(cmp.upsetBonusMax).toBeGreaterThan(0); // bold pending picks have upside
  });

  it("pays a correctly-called upset more than a correctly-called favourite (same round)", () => {
    const F1 = groupTeamId(5, 1), C2 = groupTeamId(2, 2); // M75: F1 (home/fav) vs C2
    const C1 = groupTeamId(2, 1), F2 = groupTeamId(5, 2); // M76: C1 (home/fav) vs F2
    const live = snapshotWith([
      done(F1, C2, 0, 2, "R32"), // upset: C2 wins M75
      done(C1, F2, 2, 0, "R32"), // chalk: C1 wins M76
    ]);
    const cmp = compareToModel(live, new Map([["M75", C2], ["M76", C1]]), OPTS);
    const m75 = cmp.picks.find((p) => p.matchId === "M75")!;
    const m76 = cmp.picks.find((p) => p.matchId === "M76")!;
    expect(m75.status).toBe("correct");
    expect(m76.status).toBe("correct");
    expect(m75.bold).toBe(true); // C2 was the head-to-head underdog
    expect(m76.bold).toBe(false); // C1 was the favourite
    expect(m75.upsetBonus).toBeGreaterThan(0);
    expect(m76.upsetBonus).toBe(0);
  });

  it("uses an upset factor that is zero at/above 50% and never increases with probability", () => {
    expect(DEFAULT_UPSET_FACTOR(0.5)).toBe(0);
    expect(DEFAULT_UPSET_FACTOR(0.8)).toBe(0);
    expect(DEFAULT_UPSET_FACTOR(0.1)).toBeGreaterThan(DEFAULT_UPSET_FACTOR(0.3));
    expect(DEFAULT_UPSET_FACTOR(0.3)).toBeGreaterThan(DEFAULT_UPSET_FACTOR(0.5));
    expect(DEFAULT_UPSET_FACTOR(0.001)).toBeLessThanOrEqual(9); // capped (5% floor)
  });
});

describe("prediction vs model — boldness", () => {
  it("counts only head-to-head underdog picks, never the favourites", () => {
    const chalk = compareToModel(snapshot, chalkPred, OPTS);
    const anti = compareToModel(snapshot, antiPred, OPTS);
    expect(chalk.boldnessCount).toBe(0); // chalk took the favourite in every match
    expect(chalk.boldnessShare).toBe(0);
    for (const p of chalk.picks) expect(p.bold).toBe(false);
    expect(anti.boldnessCount).toBeGreaterThan(chalk.boldnessCount);
  });
});

describe("prediction vs model — projected score", () => {
  it("equals the sum of per-pick expected points and is deterministic", () => {
    const a = compareToModel(snapshot, chalkPred, OPTS);
    const b = compareToModel(snapshot, chalkPred, OPTS);
    const sum = a.picks.reduce((s, p) => s + p.expectedPoints, 0);
    expect(a.projectedScore).toBeCloseTo(sum, 6);
    expect(a.projectedScore).toBeGreaterThan(0);
    expect(a.projectedScore).toBe(b.projectedScore);
    expect(a.picks).toEqual(b.picks);
  });

  it("gives a head-to-head probability in [0,1] for every pick", () => {
    const cmp = compareToModel(snapshot, chalkPred, OPTS);
    for (const p of cmp.picks) {
      expect(p.headToHead).toBeGreaterThanOrEqual(0);
      expect(p.headToHead).toBeLessThanOrEqual(1);
    }
  });
});
