// Static FIFA World Cup 2026 knockout layout — the single source of truth shared
// by `bracket.ts` (structure) and `montecarlo.ts` (per-trial play-out).
//
// Sources (official FIFA 2026 match schedule / regulations):
//  - Round of 32 pairings (matches 73–88) and the third-placed candidate groups
//    per slot. Cross-checked: the eight group winners paired with a third-placed
//    team are A, B, D, E, G, I, K, L (1C plays 2F; 1B plays a third) — verified
//    against Wikipedia and ESPN's published fixtures.
//  - Round of 16 → Final chaining (89–104, excluding the 3rd-place playoff 103).

import type { GroupId } from "../data/models";
import type { GroupPosition, KnockoutStage } from "./types";

/** Feeder spec for a Round-of-32 slot, as published. */
export type R32Feeder =
  | { kind: "group"; group: GroupId; position: GroupPosition }
  | { kind: "thirdPlace"; candidateGroups: GroupId[] };

const g = (group: GroupId, position: GroupPosition): R32Feeder => ({ kind: "group", group, position });
const third = (candidateGroups: GroupId[]): R32Feeder => ({ kind: "thirdPlace", candidateGroups });

/**
 * Round of 32 (matches 73–88), official 2026 layout. `home`/`away` mirror the
 * published "vs" ordering; the engine treats slots symmetrically.
 */
export const R32_LAYOUT: ReadonlyArray<{ match: number; home: R32Feeder; away: R32Feeder }> = [
  { match: 73, home: g("a", "runnerUp"), away: g("b", "runnerUp") },
  { match: 74, home: g("e", "winner"), away: third(["a", "b", "c", "d", "f"]) },
  { match: 75, home: g("f", "winner"), away: g("c", "runnerUp") },
  { match: 76, home: g("c", "winner"), away: g("f", "runnerUp") },
  { match: 77, home: g("i", "winner"), away: third(["c", "d", "f", "g", "h"]) },
  { match: 78, home: g("e", "runnerUp"), away: g("i", "runnerUp") },
  { match: 79, home: g("a", "winner"), away: third(["c", "e", "f", "h", "i"]) },
  { match: 80, home: g("l", "winner"), away: third(["e", "h", "i", "j", "k"]) },
  { match: 81, home: g("d", "winner"), away: third(["b", "e", "f", "i", "j"]) },
  { match: 82, home: g("g", "winner"), away: third(["a", "e", "h", "i", "j"]) },
  { match: 83, home: g("k", "runnerUp"), away: g("l", "runnerUp") },
  { match: 84, home: g("h", "winner"), away: g("j", "runnerUp") },
  { match: 85, home: g("b", "winner"), away: third(["e", "f", "g", "i", "j"]) },
  { match: 86, home: g("j", "winner"), away: g("h", "runnerUp") },
  { match: 87, home: g("k", "winner"), away: third(["d", "e", "i", "j", "l"]) },
  { match: 88, home: g("d", "runnerUp"), away: g("g", "runnerUp") },
];

/** Rounds R16 → Final (matches 89–104, excluding 3rd-place playoff 103). */
export const KO_LAYOUT: ReadonlyArray<{ match: number; stage: KnockoutStage; home: number; away: number }> = [
  { match: 89, stage: "R16", home: 74, away: 77 },
  { match: 90, stage: "R16", home: 73, away: 75 },
  { match: 91, stage: "R16", home: 76, away: 78 },
  { match: 92, stage: "R16", home: 79, away: 80 },
  { match: 93, stage: "R16", home: 83, away: 84 },
  { match: 94, stage: "R16", home: 81, away: 82 },
  { match: 95, stage: "R16", home: 86, away: 88 },
  { match: 96, stage: "R16", home: 85, away: 87 },
  { match: 97, stage: "QF", home: 89, away: 90 },
  { match: 98, stage: "QF", home: 93, away: 94 },
  { match: 99, stage: "QF", home: 91, away: 92 },
  { match: 100, stage: "QF", home: 95, away: 96 },
  { match: 101, stage: "SF", home: 97, away: 98 },
  { match: 102, stage: "SF", home: 99, away: 100 },
  { match: 104, stage: "F", home: 101, away: 102 },
];

/** The eight Round-of-32 slots fed by a third-placed team, with their candidate groups. */
export const THIRD_PLACE_SLOTS: ReadonlyArray<{ match: number; candidateGroups: GroupId[] }> = R32_LAYOUT.flatMap(
  (m) =>
    m.away.kind === "thirdPlace"
      ? [{ match: m.match, candidateGroups: m.away.candidateGroups }]
      : m.home.kind === "thirdPlace"
        ? [{ match: m.match, candidateGroups: m.home.candidateGroups }]
        : [],
);

/** The next stage a team reaches by winning a match of the given stage. */
export const REACH_BY_WINNING: Record<KnockoutStage, "r16" | "qf" | "sf" | "final" | "champion"> = {
  R32: "r16",
  R16: "qf",
  QF: "sf",
  SF: "final",
  F: "champion",
};

/** Official match numbers per knockout round, in round order. */
export const STAGE_MATCH_NUMBERS: Record<KnockoutStage, number[]> = {
  R32: R32_LAYOUT.map((m) => m.match),
  R16: KO_LAYOUT.filter((m) => m.stage === "R16").map((m) => m.match),
  QF: KO_LAYOUT.filter((m) => m.stage === "QF").map((m) => m.match),
  SF: KO_LAYOUT.filter((m) => m.stage === "SF").map((m) => m.match),
  F: KO_LAYOUT.filter((m) => m.stage === "F").map((m) => m.match),
};

/** Knockout rounds in chronological order. */
export const ORDERED_STAGES: KnockoutStage[] = ["R32", "R16", "QF", "SF", "F"];
