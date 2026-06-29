import { describe, it, expect } from "vitest";
import type { TournamentSnapshot, Team, Fixture } from "../data/models";
import { buildBracket } from "./bracket";
import type { BracketMatch } from "./types";

const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] as const;

/** Group g (0-based) owns team ids 4g+1..4g+4. */
function groupTeamId(letterIdx: number, posInGroup: number): number {
  return letterIdx * 4 + posInGroup; // posInGroup 1..4
}

function allTeams(): Team[] {
  const teams: Team[] = [];
  LETTERS.forEach((letter, gi) => {
    for (let p = 1; p <= 4; p++) {
      const id = groupTeamId(gi, p);
      teams.push({ id, name: `${letter.toUpperCase()}${p}`, abbr: `${letter.toUpperCase()}${p}`, group: letter, isEliminated: false });
    }
  });
  return teams;
}

let seq = 5000;
function done(homeId: number, awayId: number, hs: number, as: number, stage: Fixture["stage"] = "GROUP"): Fixture {
  return {
    id: seq++,
    roundId: 1,
    stage,
    status: "complete",
    kickoff: "2026-06-12T00:00:00Z",
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeScore: hs,
    awayScore: as,
    venue: null,
  };
}
function scheduled(homeId: number, awayId: number, stage: Fixture["stage"] = "R32"): Fixture {
  return {
    id: seq++,
    roundId: 5,
    stage,
    status: "scheduled",
    kickoff: "2026-06-28T00:00:00Z",
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeScore: null,
    awayScore: null,
    venue: null,
  };
}

/** Completed round-robin for one group where p1 > p2 > p3 > p4 on points. */
function finalGroupFixtures(gi: number): Fixture[] {
  const t = (p: number) => groupTeamId(gi, p);
  return [
    done(t(1), t(2), 1, 0),
    done(t(1), t(3), 1, 0),
    done(t(1), t(4), 1, 0),
    done(t(2), t(3), 1, 0),
    done(t(2), t(4), 1, 0),
    done(t(3), t(4), 1, 0),
  ];
}

function baseSnapshot(fixtures: Fixture[]): TournamentSnapshot {
  const teams = allTeams();
  const groups = LETTERS.map((id) => ({ id, teams: teams.filter((t) => t.group === id) }));
  return {
    fetchedAt: "2026-06-26T00:00:00Z",
    teams,
    groups,
    players: [],
    rounds: [],
    fixtures,
  };
}

/** A snapshot with NO completed fixtures — nothing is decided yet. */
function emptySnapshot(): TournamentSnapshot {
  return baseSnapshot([]);
}

/** A snapshot where all 12 groups are final (winner=p1, runner-up=p2, third=p3). */
function allGroupsFinalSnapshot(extra: Fixture[] = []): TournamentSnapshot {
  const fixtures: Fixture[] = [];
  for (let gi = 0; gi < 12; gi++) fixtures.push(...finalGroupFixtures(gi));
  fixtures.push(...extra);
  return baseSnapshot(fixtures);
}

const byNum = (b: ReturnType<typeof buildBracket>) => new Map(b.matches.map((m) => [m.matchNumber, m]));

describe("knockout bracket — structure", () => {
  it("has the correct number of matches per round", () => {
    const b = buildBracket(emptySnapshot());
    expect(b.byStage.R32).toHaveLength(16);
    expect(b.byStage.R16).toHaveLength(8);
    expect(b.byStage.QF).toHaveLength(4);
    expect(b.byStage.SF).toHaveLength(2);
    expect(b.byStage.F).toHaveLength(1);
    expect(b.matches).toHaveLength(31);
  });

  it("gives every slot a feeder", () => {
    const b = buildBracket(emptySnapshot());
    for (const m of b.matches) {
      expect(m.slots).toHaveLength(2);
      for (const s of m.slots) expect(s.feeder).toBeTruthy();
    }
  });

  it("chains rounds so the tree terminates at a single Final", () => {
    const b = buildBracket(emptySnapshot());
    const m = byNum(b);
    // Every non-R32 slot is fed by a match in the previous round.
    for (const match of b.matches) {
      if (match.stage === "R32") continue;
      for (const s of match.slots) {
        expect(s.feeder.kind).toBe("matchWinner");
        if (s.feeder.kind === "matchWinner") {
          const predNum = Number(s.feeder.matchId.slice(1));
          expect(m.has(predNum)).toBe(true);
        }
      }
    }
    // The Final (104) is fed by the two semifinals.
    const fin = m.get(104)!;
    expect(fin.stage).toBe("F");
    const feederIds = fin.slots.map((s) => (s.feeder.kind === "matchWinner" ? s.feeder.matchId : ""));
    expect(feederIds).toEqual(["M101", "M102"]);
  });

  it("is deterministic for identical snapshots", () => {
    const a = buildBracket(allGroupsFinalSnapshot());
    const b = buildBracket(allGroupsFinalSnapshot());
    expect(a).toEqual(b);
  });
});

describe("knockout bracket — official seeding layout", () => {
  it("places all 12 winners and 12 runners-up exactly once across the R32", () => {
    const b = buildBracket(emptySnapshot());
    const seen = new Map<string, number>();
    for (const m of b.byStage.R32) {
      for (const s of m.slots) {
        if (s.feeder.kind === "group") {
          const key = `${s.feeder.group}-${s.feeder.position}`;
          seen.set(key, (seen.get(key) ?? 0) + 1);
        }
      }
    }
    for (const letter of LETTERS) {
      expect(seen.get(`${letter}-winner`)).toBe(1);
      expect(seen.get(`${letter}-runnerUp`)).toBe(1);
    }
  });

  it("matches specific published R32 pairings", () => {
    const b = buildBracket(emptySnapshot());
    const m = byNum(b);
    // Match 75: Winner F vs Runner-up C
    expect(m.get(75)!.slots.map((s) => s.feeder)).toEqual([
      { kind: "group", group: "f", position: "winner" },
      { kind: "group", group: "c", position: "runnerUp" },
    ]);
    // Match 79: Winner A vs a third-placed team from C/E/F/H/I
    const m79 = m.get(79)!;
    expect(m79.slots[0]!.feeder).toEqual({ kind: "group", group: "a", position: "winner" });
    expect(m79.slots[1]!.feeder).toEqual({ kind: "thirdPlace", candidateGroups: ["c", "e", "f", "h", "i"] });
  });

  it("has exactly eight third-placed slots", () => {
    const b = buildBracket(emptySnapshot());
    const thirdSlots = b.byStage.R32.flatMap((m) => m.slots).filter((s) => s.feeder.kind === "thirdPlace");
    expect(thirdSlots).toHaveLength(8);
  });
});

describe("knockout bracket — placeholders", () => {
  it("shows group-position placeholders when groups are undecided", () => {
    const b = buildBracket(emptySnapshot());
    const m = byNum(b);
    expect(m.get(75)!.slots[0]!.label).toBe("Winner Group F");
    expect(m.get(75)!.slots[1]!.label).toBe("Runner-up Group C");
    expect(m.get(75)!.slots[0]!.team).toBeNull();
  });

  it("shows a candidate-set placeholder for undetermined third-placed slots", () => {
    const b = buildBracket(emptySnapshot());
    const m = byNum(b);
    expect(m.get(80)!.slots[1]!.label).toBe("3rd E/H/I/J/K");
    expect(m.get(80)!.slots[1]!.team).toBeNull();
  });

  it("describes match-winner placeholders by their participants", () => {
    const b = buildBracket(emptySnapshot());
    const m = byNum(b);
    // Match 90 = Winner 73 vs Winner 75.
    const labels = m.get(90)!.slots.map((s) => s.label);
    expect(labels[0]).toContain("M73");
    expect(labels[1]).toContain("M75");
    expect(m.get(90)!.slots.every((s) => s.team === null)).toBe(true);
  });
});

describe("knockout bracket — resolution", () => {
  it("resolves group winners and runners-up once groups are final", () => {
    const b = buildBracket(allGroupsFinalSnapshot());
    const m = byNum(b);
    // Group F winner is F1 (id 24), Group C runner-up is C2 (id 10).
    const m75 = m.get(75)!;
    expect(m75.slots[0]!.team).toMatchObject({ teamId: groupTeamId(5, 1) }); // F1
    expect(m75.slots[1]!.team).toMatchObject({ teamId: groupTeamId(2, 2) }); // C2
    expect(m75.slots[0]!.label).toBe("F1");
  });

  it("grounds a third-placed slot from the snapshot's own R32 fixture", () => {
    // Match 74 = Winner E (E1, id 17) vs a third-placed team. FIFA assigns C3 (id 11).
    const e1 = groupTeamId(4, 1);
    const c3 = groupTeamId(2, 3);
    const b = buildBracket(allGroupsFinalSnapshot([scheduled(e1, c3, "R32")]));
    const m74 = byNum(b).get(74)!;
    const thirdSlot = m74.slots[1]!;
    expect(thirdSlot.feeder.kind).toBe("thirdPlace");
    expect(thirdSlot.team).toMatchObject({ teamId: c3 });
    expect(thirdSlot.label).toBe("C3");
  });

  it("leaves third-placed slots as placeholders until groups are final or assigned", () => {
    // 11 of 12 groups final → neither grounding nor the Annex C allocation can
    // run (allocation needs every group final), so third slots stay placeholders.
    const fixtures: Fixture[] = [];
    for (let gi = 0; gi < 11; gi++) fixtures.push(...finalGroupFixtures(gi)); // leave group L incomplete
    const b = buildBracket(baseSnapshot(fixtures));
    const m74 = byNum(b).get(74)!;
    expect(m74.slots[1]!.team).toBeNull();
    expect(m74.slots[1]!.label).toBe("3rd A/B/C/D/F");
  });

  it("fills third-placed slots via the Annex C allocation once every group is final", () => {
    const b = buildBracket(allGroupsFinalSnapshot());
    // All eight third-placed slots resolve to a concrete team, each from a group
    // within that slot's candidate set.
    const thirdSlots = b.byStage.R32.flatMap((m) => m.slots).filter((s) => s.feeder.kind === "thirdPlace");
    expect(thirdSlots).toHaveLength(8);
    for (const s of thirdSlots) {
      expect(s.team, `unresolved: ${s.label}`).not.toBeNull();
      if (s.feeder.kind === "thirdPlace" && s.team) {
        // The resolved team's group must be one of the slot's candidates.
        const teamGroup = LETTERS[Math.floor((s.team.teamId - 1) / 4)]!;
        expect(s.feeder.candidateGroups).toContain(teamGroup);
      }
    }
  });

  it("reads a completed knockout result and propagates the winner up the tree", () => {
    const f1 = groupTeamId(5, 1); // Winner F → match 75 home
    const c2 = groupTeamId(2, 2); // Runner-up C → match 75 away
    const extra = [
      done(f1, c2, 2, 0, "R32"), // F1 wins match 75
    ];
    const b = buildBracket(allGroupsFinalSnapshot(extra));
    const m = byNum(b);
    expect(m.get(75)!.winner).toMatchObject({ teamId: f1 });
    // Match 90 = Winner 73 vs Winner 75 → its away slot should now be F1.
    const m90 = m.get(90)!;
    expect(m90.slots[1]!.feeder).toEqual({ kind: "matchWinner", matchId: "M75" });
    expect(m90.slots[1]!.team).toMatchObject({ teamId: f1 });
    expect(m90.slots[1]!.label).toBe("F1");
  });

  it("has no R32 placeholders once every group and third-placed assignment is known", () => {
    // Fully assign all 16 R32 fixtures with concrete teams (winners, runners-up,
    // and a valid third-placed team per published candidate sets).
    const gi = (letter: string) => LETTERS.indexOf(letter as (typeof LETTERS)[number]);
    const w = (letter: string) => groupTeamId(gi(letter), 1);
    const r = (letter: string) => groupTeamId(gi(letter), 2);
    const t3 = (letter: string) => groupTeamId(gi(letter), 3);
    const r32: Fixture[] = [
      scheduled(r("a"), r("b")), // 73
      scheduled(w("e"), t3("a")), // 74  (3rd from A — valid: A in {A,B,C,D,F})
      scheduled(w("f"), r("c")), // 75
      scheduled(w("c"), r("f")), // 76
      scheduled(w("i"), t3("d")), // 77  (D ∈ {C,D,F,G,H})
      scheduled(r("e"), r("i")), // 78
      scheduled(w("a"), t3("c")), // 79  (C ∈ {C,E,F,H,I})
      scheduled(w("l"), t3("k")), // 80  (K ∈ {E,H,I,J,K})
      scheduled(w("d"), t3("b")), // 81  (B ∈ {B,E,F,I,J})
      scheduled(w("g"), t3("h")), // 82  (H ∈ {A,H,I,J})
      scheduled(r("k"), r("l")), // 83
      scheduled(w("h"), r("j")), // 84
      scheduled(w("b"), t3("g")), // 85  (G ∈ {E,F,G,I,J})
      scheduled(w("j"), r("h")), // 86
      scheduled(w("k"), t3("l")), // 87  (L ∈ {D,E,I,J,L})
      scheduled(r("d"), r("g")), // 88
    ];
    const b = buildBracket(allGroupsFinalSnapshot(r32));
    for (const m of b.byStage.R32) {
      for (const s of m.slots) {
        expect(s.team, `R32 ${m.id} slot unresolved: ${s.label}`).not.toBeNull();
      }
    }
  });
});
