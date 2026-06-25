import { describe, it, expect } from "vitest";
import { computeGroupStandings } from "./standings";
import { team, done, todo, liveMatch, snapshot } from "./testutil";

const teams = [team(1, "AAA"), team(2, "BBB"), team(3, "CCC"), team(4, "DDD")];

describe("group standings", () => {
  it("accumulates points and goals from completed fixtures only", () => {
    const snap = snapshot(teams, [
      done(1, 2, 2, 0), // AAA beats BBB
      done(3, 4, 1, 1), // CCC draws DDD
      todo(1, 3), // scheduled — must not count
      todo(2, 4),
    ]);
    const table = computeGroupStandings(snap, "a");
    const byId = new Map(table.rows.map((r) => [r.teamId, r]));

    expect(byId.get(1)).toMatchObject({ played: 1, won: 1, points: 3, goalsFor: 2, goalsAgainst: 0, goalDifference: 2 });
    expect(byId.get(2)).toMatchObject({ played: 1, won: 0, points: 0, goalDifference: -2 });
    expect(byId.get(3)).toMatchObject({ played: 1, drawn: 1, points: 1 });
    expect(byId.get(4)).toMatchObject({ played: 1, drawn: 1, points: 1 });
    expect(table.provisional).toBe(false);
  });

  it("separates equal-points teams by goal difference", () => {
    const snap = snapshot(teams, [
      done(1, 4, 3, 0), // AAA +3
      done(2, 3, 1, 0), // BBB +1
    ]);
    const rows = computeGroupStandings(snap, "a").rows;
    // AAA and BBB both 3 pts; AAA superior GD ranks first.
    expect(rows[0]!.teamId).toBe(1);
    expect(rows[1]!.teamId).toBe(2);
  });

  it("applies head-to-head among teams tied on all-match criteria (overriding lots)", () => {
    // Construct T2 and T3 equal on points/GD/GF across all matches, with T3
    // beating T2 head-to-head. Lots (ascending id) would rank T2 first, so a
    // T3-above-T2 result proves head-to-head was applied.
    const snap = snapshot(teams, [
      done(3, 2, 1, 0), // CCC beats BBB head-to-head
      done(2, 1, 1, 0), // BBB beats AAA
      done(3, 4, 0, 1), // CCC loses to DDD
      done(2, 4, 0, 1), // BBB loses to DDD
      done(1, 3, 1, 0), // AAA beats CCC
      done(1, 4, 0, 0), // filler
    ]);
    const rows = computeGroupStandings(snap, "a").rows;
    const pos = new Map(rows.map((r, i) => [r.teamId, i]));
    const t2 = rows[pos.get(2)!]!;
    const t3 = rows[pos.get(3)!]!;
    // Both equal on the all-match criteria...
    expect(t2.points).toBe(t3.points);
    expect(t2.goalDifference).toBe(t3.goalDifference);
    expect(t2.goalsFor).toBe(t3.goalsFor);
    // ...and CCC (id 3) is ranked above BBB (id 2) via head-to-head.
    expect(pos.get(3)!).toBeLessThan(pos.get(2)!);
  });

  it("produces a deterministic, reproducible order when teams are fully level", () => {
    const snap = snapshot(teams, []); // no matches: all level → lots by id
    const a = computeGroupStandings(snap, "a").rows.map((r) => r.teamId);
    const b = computeGroupStandings(snap, "a").rows.map((r) => r.teamId);
    expect(a).toEqual([1, 2, 3, 4]);
    expect(b).toEqual(a);
  });

  it("excludes live scores by default but folds them in provisional mode", () => {
    const snap = snapshot(teams, [done(1, 2, 1, 0), liveMatch(3, 4, 2, 0)]);

    const def = computeGroupStandings(snap, "a");
    expect(def.provisional).toBe(false);
    expect(def.rows.find((r) => r.teamId === 3)!.points).toBe(0); // live not counted

    const prov = computeGroupStandings(snap, "a", { provisional: true });
    expect(prov.provisional).toBe(true);
    expect(prov.rows.find((r) => r.teamId === 3)!.points).toBe(3); // live folded in
  });
});
