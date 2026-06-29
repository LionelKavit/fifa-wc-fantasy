import { describe, it, expect } from "vitest";
import type { TournamentSnapshot, Team, Fixture } from "../data/models";
import { generateBracket, recommendRisk, type RiskLevel } from "./bracketGenerator";
import { buildBracket } from "./bracket";
import { predictedParticipants } from "./prediction";
import { KO_LAYOUT } from "./bracketLayout";
import type { Prediction, KnockoutStage } from "./types";

// --- Synthetic snapshot: 12 groups, all group games decided so the R32 is determined. ---
const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] as const;
const groupTeamId = (gi: number, p: number): number => gi * 4 + p;
let seq = 40000;
function done(homeId: number, awayId: number, hs: number, as: number, stage: Fixture["stage"] = "GROUP"): Fixture {
  return { id: seq++, roundId: 1, stage, status: "complete", kickoff: "2026-06-12T00:00:00Z", homeTeamId: homeId, awayTeamId: awayId, homeScore: hs, awayScore: as, venue: null };
}
function finalGroupFixtures(gi: number): Fixture[] {
  const t = (p: number) => groupTeamId(gi, p);
  return [done(t(1), t(2), 1, 0), done(t(1), t(3), 1, 0), done(t(1), t(4), 1, 0), done(t(2), t(3), 1, 0), done(t(2), t(4), 1, 0), done(t(3), t(4), 1, 0)];
}
function snapshotWith(): TournamentSnapshot {
  const teams: Team[] = [];
  LETTERS.forEach((letter, gi) => {
    for (let p = 1; p <= 4; p++) teams.push({ id: groupTeamId(gi, p), name: `${letter.toUpperCase()}${p}`, abbr: `${letter.toUpperCase()}${p}`, group: letter, isEliminated: false });
  });
  const groups = LETTERS.map((id) => ({ id, teams: teams.filter((t) => t.group === id) }));
  const fixtures: Fixture[] = [];
  for (let gi = 0; gi < 12; gi++) fixtures.push(...finalGroupFixtures(gi));
  return { fetchedAt: "2026-06-30T00:00:00Z", teams, groups, players: [], rounds: [], fixtures };
}

const snapshot = snapshotWith();
const bracket = buildBracket(snapshot);

// Higher team id = favorite; the underdog wins ~30% → multiplier 2 (a "real" upset).
const matchupWinProb = (a: number, b: number): number => (a > b ? 0.7 : 0.3);
// Everything a coin-flip → multiplier 1, so nothing is worth an upset.
const coinFlip = (a: number, b: number): number => (a > b ? 0.55 : 0.45);

function gen(risk: RiskLevel, poolSize: number, mwp = matchupWinProb): Prediction {
  return generateBracket(snapshot, { risk, poolSize, matchupWinProb: mwp, seed: 1 });
}
function countUnderdogs(pred: Prediction, mwp = matchupWinProb): number {
  let n = 0;
  for (const [matchId, team] of pred) {
    const [a, b] = predictedParticipants(bracket, pred, matchId);
    if (a === null || b === null) continue;
    const opp = team === a ? b : a;
    if (mwp(team, opp) < 0.5) n++;
  }
  return n;
}

describe("bracket generator — completeness & feasibility", () => {
  it("produces a complete, feasible bracket for every risk level", () => {
    for (const risk of ["safe", "balanced", "bold"] as const) {
      const pred = gen(risk, 20);
      expect(pred.size).toBe(bracket.matches.length);
      for (const layout of KO_LAYOUT) {
        const winner = pred.get(`M${layout.match}`);
        expect([pred.get(`M${layout.home}`), pred.get(`M${layout.away}`)]).toContain(winner);
      }
    }
  });

  it("safe is pure chalk (no upsets)", () => {
    expect(countUnderdogs(gen("safe", 100))).toBe(0);
  });
});

describe("bracket generator — boldness scaling", () => {
  it("takes non-decreasing upsets safe → balanced → bold, strictly more at bold", () => {
    const safe = countUnderdogs(gen("safe", 20));
    const balanced = countUnderdogs(gen("balanced", 20));
    const bold = countUnderdogs(gen("bold", 20));
    expect(safe).toBeLessThanOrEqual(balanced);
    expect(balanced).toBeLessThanOrEqual(bold);
    expect(bold).toBeGreaterThan(safe);
  });

  it("a larger pool takes at least as many upsets at the same risk", () => {
    expect(countUnderdogs(gen("balanced", 60))).toBeGreaterThanOrEqual(countUnderdogs(gen("balanced", 4)));
  });

  it("bold can crown an underdog while safe keeps the favorite", () => {
    const safe = gen("safe", 80);
    const [a, b] = predictedParticipants(bracket, safe, "M104");
    const favorite = matchupWinProb(a!, b!) >= 0.5 ? a! : b!;
    expect(safe.get("M104")).toBe(favorite); // safe keeps the favorite champion

    const bold = gen("bold", 80);
    const [ba, bb] = predictedParticipants(bracket, bold, "M104");
    const boldChamp = bold.get("M104")!;
    expect(matchupWinProb(boldChamp, boldChamp === ba ? bb! : ba!)).toBeLessThan(0.5); // bold champ is an underdog
  });
});

describe("bracket generator — grounded by value", () => {
  it("prefers high-value upsets (deep rounds) over low-value ones", () => {
    // value ∝ round weight, so the Final (16) outranks any R32 (1): the champion is
    // upset at balanced while Round-of-32 favorites are kept.
    const pred = gen("balanced", 20);
    const [a, b] = predictedParticipants(bracket, pred, "M104");
    const champ = pred.get("M104")!;
    expect(matchupWinProb(champ, champ === a ? b! : a!)).toBeLessThan(0.5); // champion is an upset
    const r32Underdogs = ["M73", "M74", "M75"].filter((id) => {
      const [x, y] = predictedParticipants(bracket, pred, id);
      const t = pred.get(id)!;
      return matchupWinProb(t, t === x ? y! : x!) < 0.5;
    });
    expect(r32Underdogs.length).toBe(0); // low-value R32 upsets not spent on at balanced
  });

  it("does not spend budget on coin-flip non-upsets", () => {
    expect(countUnderdogs(gen("bold", 100, coinFlip), coinFlip)).toBe(0);
  });
});

describe("bracket generator — expert signals", () => {
  // The chalk (all-favorite) participants, to find a match's underdog/favorite ids.
  const chalk = (() => {
    const pred: Prediction = new Map();
    for (const m of bracket.matches) {
      const [a, b] = predictedParticipants(bracket, pred, m.id);
      if (a === null || b === null) continue;
      pred.set(m.id, matchupWinProb(a, b) >= 0.5 ? a : b);
    }
    return pred;
  })();
  const sides = (matchId: string) => {
    const [a, b] = predictedParticipants(bracket, chalk, matchId);
    const favorite = matchupWinProb(a!, b!) >= 0.5 ? a! : b!;
    return { favorite, underdog: favorite === a ? b! : a! };
  };

  it("empty signals reproduce the no-signals bracket exactly", () => {
    const base = generateBracket(snapshot, { risk: "bold", poolSize: 30, matchupWinProb, seed: 1 });
    const withEmpty = generateBracket(snapshot, { risk: "bold", poolSize: 30, matchupWinProb, seed: 1, favor: new Set(), fade: new Set() });
    expect([...withEmpty]).toEqual([...base]);
  });

  it("favoring a team's underdog gets that upset selected", () => {
    const { underdog } = sides("M97"); // a quarterfinal
    const pred = generateBracket(snapshot, { risk: "balanced", poolSize: 20, matchupWinProb, seed: 1, favor: new Set([underdog]) });
    expect(pred.get("M97")).toBe(underdog);
  });

  it("fading a favorite biases its match toward an upset", () => {
    const { favorite, underdog } = sides("M98"); // a quarterfinal
    const pred = generateBracket(snapshot, { risk: "balanced", poolSize: 20, matchupWinProb, seed: 1, fade: new Set([favorite]) });
    expect(pred.get("M98")).toBe(underdog);
  });

  it("stays deterministic and feasible with signals", () => {
    const { underdog } = sides("M97");
    const opts = { risk: "bold" as const, poolSize: 40, matchupWinProb, seed: 1, favor: new Set([underdog]) };
    const a = generateBracket(snapshot, opts);
    const b = generateBracket(snapshot, opts);
    expect([...a]).toEqual([...b]);
    expect(a.size).toBe(bracket.matches.length);
    for (const layout of KO_LAYOUT) {
      expect([a.get(`M${layout.home}`), a.get(`M${layout.away}`)]).toContain(a.get(`M${layout.match}`));
    }
  });
});

describe("bracket generator — grounded selection (stageWinProb)", () => {
  const reach = (vals: Record<KnockoutStage, number>) => (_t: number, stage: KnockoutStage) => vals[stage];
  // Plausibility decays with depth → deep upsets are far-fetched.
  const decaying = reach({ R32: 0.9, R16: 0.6, QF: 0.3, SF: 0.05, F: 0.01 });
  // The final's underdog is the most plausible win → a deep upset is realistic.
  const deepLikely = reach({ R32: 0.1, R16: 0.1, QF: 0.1, SF: 0.1, F: 0.99 });
  const flat = reach({ R32: 0.5, R16: 0.5, QF: 0.5, SF: 0.5, F: 0.5 });

  const isUpset = (pred: Prediction, matchId: string): boolean => {
    const [a, b] = predictedParticipants(bracket, pred, matchId);
    const t = pred.get(matchId);
    return t !== undefined && a !== null && b !== null && matchupWinProb(t, t === a ? b : a) < 0.5;
  };
  const stageOf = (matchId: string) => bracket.matches.find((m) => m.id === matchId)!.stage;

  it("does not send a far-fetched underdog deep (champion kept, upsets stay early)", () => {
    const pred = generateBracket(snapshot, { risk: "balanced", poolSize: 20, matchupWinProb, stageWinProb: decaying, seed: 1 });
    const [a, b] = predictedParticipants(bracket, pred, "M104");
    expect(pred.get("M104")).toBe(matchupWinProb(a!, b!) >= 0.5 ? a! : b!); // champion is the favorite
    const upsetStages = [...pred.keys()].filter((id) => isUpset(pred, id)).map(stageOf);
    expect(upsetStages.every((s) => s === "R32" || s === "R16" || s === "QF")).toBe(true); // none deep
  });

  it("allows a deeper upset when it is realistically reachable", () => {
    const pred = generateBracket(snapshot, { risk: "balanced", poolSize: 20, matchupWinProb, stageWinProb: deepLikely, seed: 1 });
    expect(isUpset(pred, "M104")).toBe(true); // high final-reach → champion upset is chosen
  });

  it("does not prefer deeper rounds by scoring weight (plausibility drives it)", () => {
    // Same flat plausibility everywhere: with the old round-weighted value the champion
    // would always be upset at balanced; with the grounded value it need not be.
    const champUpsetBySeed = [1, 2, 3, 4].map((seed) =>
      isUpset(generateBracket(snapshot, { risk: "balanced", poolSize: 20, matchupWinProb, stageWinProb: flat, seed }), "M104"),
    );
    expect(champUpsetBySeed.some((u) => u === false)).toBe(true);
  });

  it("still gates out coin-flip non-upsets", () => {
    const pred = generateBracket(snapshot, { risk: "bold", poolSize: 100, matchupWinProb: coinFlip, stageWinProb: flat, seed: 1 });
    expect(countUnderdogs(pred, coinFlip)).toBe(0);
  });

  it("is deterministic and still honors favor signals on the grounded path", () => {
    const opts = { risk: "bold" as const, poolSize: 30, matchupWinProb, stageWinProb: decaying, seed: 1 };
    expect([...generateBracket(snapshot, opts)]).toEqual([...generateBracket(snapshot, opts)]);

    const [a, b] = predictedParticipants(bracket, new Map(), "M73"); // R32: fixed teams
    const underdog = matchupWinProb(a!, b!) >= 0.5 ? b! : a!;
    const pred = generateBracket(snapshot, { risk: "balanced", poolSize: 20, matchupWinProb, stageWinProb: flat, seed: 1, favor: new Set([underdog]) });
    expect(pred.get("M73")).toBe(underdog); // favored underdog selected under flat plausibility
  });
});

describe("bracket generator — determinism & recommendation", () => {
  it("is deterministic under a fixed seed", () => {
    expect([...gen("bold", 30)]).toEqual([...gen("bold", 30)]);
  });

  it("recommends safer for small pools and bolder for large pools", () => {
    expect(recommendRisk(4).risk).toBe("safe");
    expect(recommendRisk(20).risk).toBe("balanced");
    expect(recommendRisk(100).risk).toBe("bold");
  });
});

describe("bracket generator — complete from existing picks (locked)", () => {
  const partOf = (matchId: string) => predictedParticipants(bracket, new Map(), matchId);
  const underdogAt = (matchId: string) => {
    const [a, b] = partOf(matchId);
    return matchupWinProb(a!, b!) >= 0.5 ? b! : a!;
  };
  const favoriteAt = (matchId: string) => {
    const [a, b] = partOf(matchId);
    return matchupWinProb(a!, b!) >= 0.5 ? a! : b!;
  };
  const feasible = (pred: Prediction) => {
    for (const layout of KO_LAYOUT) {
      expect([pred.get(`M${layout.home}`), pred.get(`M${layout.away}`)]).toContain(pred.get(`M${layout.match}`));
    }
  };

  it("empty locked equals from-scratch", () => {
    const scratch = generateBracket(snapshot, { risk: "bold", poolSize: 50, matchupWinProb, seed: 1 });
    const withEmpty = generateBracket(snapshot, { risk: "bold", poolSize: 50, matchupWinProb, seed: 1, locked: new Map() });
    expect([...withEmpty]).toEqual([...scratch]);
  });

  it("keeps existing picks and fills the rest (complete + feasible)", () => {
    const locked: Prediction = new Map([["M73", underdogAt("M73")], ["M74", favoriteAt("M74")]]);
    const pred = generateBracket(snapshot, { risk: "balanced", poolSize: 20, matchupWinProb, seed: 1, locked });
    expect(pred.get("M73")).toBe(underdogAt("M73"));
    expect(pred.get("M74")).toBe(favoriteAt("M74"));
    expect(pred.size).toBe(bracket.matches.length);
    feasible(pred);
  });

  it("ignores a locked pick that isn't a valid participant", () => {
    const bogus = favoriteAt("M80"); // a team that doesn't play in M73
    const pred = generateBracket(snapshot, { risk: "safe", poolSize: 4, matchupWinProb, seed: 1, locked: new Map([["M73", bogus]]) });
    expect(partOf("M73")).toContain(pred.get("M73")); // decided normally
    expect(pred.get("M73")).not.toBe(bogus);
    expect(pred.size).toBe(bracket.matches.length);
    feasible(pred);
  });

  it("counts locked upsets toward the budget (never overrides, never exceeds)", () => {
    // safe budget = 0: a locked upset is kept, and no extra upsets are added.
    const safe = generateBracket(snapshot, { risk: "safe", poolSize: 100, matchupWinProb, seed: 1, locked: new Map([["M73", underdogAt("M73")]]) });
    expect(safe.get("M73")).toBe(underdogAt("M73"));
    expect(countUnderdogs(safe)).toBe(1); // kept upset only; safe adds none

    // balanced from scratch takes B upsets; locking 2 ⇒ total ≤ B (budget counts the locked ones).
    const B = countUnderdogs(generateBracket(snapshot, { risk: "balanced", poolSize: 20, matchupWinProb, seed: 1 }));
    const locked: Prediction = new Map([["M73", underdogAt("M73")], ["M76", underdogAt("M76")]]);
    const completed = generateBracket(snapshot, { risk: "balanced", poolSize: 20, matchupWinProb, seed: 1, locked });
    expect(completed.get("M73")).toBe(underdogAt("M73"));
    expect(completed.get("M76")).toBe(underdogAt("M76"));
    expect(countUnderdogs(completed)).toBeLessThanOrEqual(B);
  });
});
