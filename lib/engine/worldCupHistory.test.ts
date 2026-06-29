import { describe, it, expect } from "vitest";
import { teamRecord, headToHead, topScorers, champions, resolveNation, historyMeta, WC_HISTORY_COVERAGE } from "./worldCupHistory";

describe("world cup history — champions", () => {
  it("lists all 22 tournaments with the right famous champions", () => {
    const c = champions();
    expect(c).toHaveLength(22);
    const by = new Map(c.map((t) => [t.year, t.champion]));
    expect(by.get(1930)).toBe("Uruguay");
    expect(by.get(1966)).toBe("England");
    expect(by.get(2002)).toBe("Brazil");
    expect(by.get(2022)).toBe("Argentina");
  });
});

describe("world cup history — team records", () => {
  it("Brazil: five titles, 22 appearances", () => {
    const r = teamRecord("Brazil")!;
    expect(r.titles).toBe(5);
    expect(r.appearances).toBe(22); // Brazil is the only ever-present nation
    expect(r.bestFinish).toBe("Champion");
    expect(r.won).toBeGreaterThan(r.lost);
  });

  it("Germany folds in the West Germany era (four titles, labelled)", () => {
    const r = teamRecord("Germany")!;
    expect(r.titles).toBe(4); // 1954, 1974, 1990 (West Germany) + 2014
    expect(r.note).toMatch(/West Germany/);
  });

  it("a former nation stays distinct (not merged into a current one)", () => {
    const sov = teamRecord("Soviet Union");
    expect(sov).not.toBeNull();
    expect(resolveNation("USSR")).toBe("Soviet Union");
    // Russia is a separate record, not the Soviet Union's
    expect(teamRecord("Russia")!.team).toBe("Russia");
  });
});

describe("world cup history — head to head", () => {
  it("Argentina vs Germany aggregates meetings across editions (incl. West Germany)", () => {
    const h = headToHead("Argentina", "Germany")!;
    expect(h.meetings.length).toBeGreaterThanOrEqual(5);
    // 1986 final (Argentina won) and 1990 final (West Germany won) are both in there.
    const finals = h.meetings.filter((m) => m.stage === "final").map((m) => m.year);
    expect(finals).toEqual(expect.arrayContaining([1986, 1990, 2014]));
    expect(h.aWins + h.bWins + h.draws).toBe(h.meetings.length);
  });

  it("returns null for an unknown nation", () => {
    expect(headToHead("Atlantis", "Brazil")).toBeNull();
  });
});

describe("world cup history — scorers", () => {
  it("returns the Golden Boot for a year and the all-time list otherwise", () => {
    const y2018 = topScorers(2018) as { goldenBoot: { player: string } };
    expect(y2018.goldenBoot.player).toBe("Harry Kane");
    const all = topScorers() as { allTime: { player: string }[] };
    expect(all.allTime[0]!.player).toBe("Miroslav Klose");
  });
});

describe("world cup history — coverage", () => {
  it("declares coverage through 2022 and excludes the in-progress tournament", () => {
    expect(WC_HISTORY_COVERAGE).toContain("2022");
    expect(WC_HISTORY_COVERAGE).toMatch(/2026|in-progress/i);
    expect(historyMeta.coverage).toBe(WC_HISTORY_COVERAGE);
  });
});
