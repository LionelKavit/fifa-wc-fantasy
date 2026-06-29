// Public types for the deterministic scenario engine (Layer 1).

import type { GroupId } from "../data/models";

export interface StandingRow {
  /** 1-based position in the group. */
  rank: number;
  teamId: number;
  abbr: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface GroupTable {
  groupId: GroupId;
  /** True when a live (in-progress) scoreline was folded into the table. */
  provisional: boolean;
  rows: StandingRow[];
}

/** A team's fate with respect to the top 2 of its group. */
export type TopTwoVerdict = "clinched" | "alive" | "eliminated";

/**
 * Overall advancement status, accounting for the best-third-placed route.
 * `thirdPlaceRace` means out of the top 2 but still able to finish 3rd — the
 * cross-group decision is deferred to the probabilistic layer (Layer 2).
 * `eliminated` here means cannot even finish 3rd (out of the tournament).
 */
export type AdvancementStatus =
  | "clinched"
  | "contention"
  | "thirdPlaceRace"
  | "eliminated";

/** Effect of a team's own next result on its TOP-2 qualification. */
export type OutcomeEffect = "clinch" | "eliminated" | "depends";

export interface OwnMatchConditions {
  fixtureId: number;
  opponentId: number;
  opponentAbbr: string;
  /** Effect on top-2 qualification if the team wins / draws / loses this match. */
  win: OutcomeEffect;
  draw: OutcomeEffect;
  loss: OutcomeEffect;
}

export interface TeamQualification {
  teamId: number;
  abbr: string;
  name: string;
  /** Verdict strictly about finishing in the top 2 of the group. */
  topTwo: TopTwoVerdict;
  /** Can still finish exactly 3rd in some scenario and is not guaranteed top 2. */
  thirdPlaceEligible: boolean;
  /** Overall status including the third-place route (no false elimination). */
  advancement: AdvancementStatus;
  bestPossibleRank: number;
  worstPossibleRank: number;
  /** Present only when the team has exactly one remaining group fixture. */
  ownMatch: OwnMatchConditions | null;
}

export interface GroupQualification {
  groupId: GroupId;
  teams: TeamQualification[];
}

// ---- Knockout bracket (Layer 1 structure) ----

/** Knockout rounds, in chronological order. */
export type KnockoutStage = "R32" | "R16" | "QF" | "SF" | "F";

/** A finishing position within a group that feeds a knockout slot. */
export type GroupPosition = "winner" | "runnerUp";

/**
 * Where a knockout slot's participant comes from — always knowable from the
 * bracket structure, independent of whether the concrete team is decided yet.
 *  - `group`        a specified group's winner or runner-up
 *  - `thirdPlace`   one of the eight qualifying third-placed teams; `candidateGroups`
 *                   are the groups whose third-placed side could land in this slot
 *  - `matchWinner`  the winner of an earlier knockout match
 */
export type Feeder =
  | { kind: "group"; group: GroupId; position: GroupPosition }
  | { kind: "thirdPlace"; candidateGroups: GroupId[] }
  | { kind: "matchWinner"; matchId: string };

/** A concrete team reference, present once a slot/winner is resolved. */
export interface BracketTeamRef {
  teamId: number;
  abbr: string;
  name: string;
}

export interface BracketSlot {
  /** Where this participant comes from (always present). */
  feeder: Feeder;
  /** The concrete team once known; null while undetermined. */
  team: BracketTeamRef | null;
  /** Display string: the resolved team's name, or a human-readable placeholder. */
  label: string;
  /** True when `team` is a model projection (a fallback before the real R32 is set),
   * not an official result. */
  projected?: boolean;
}

export interface BracketMatch {
  /** Stable id derived from the official match number, e.g. "M73". */
  id: string;
  /** Official FIFA schedule match number (73–104, excluding the third-place playoff). */
  matchNumber: number;
  stage: KnockoutStage;
  slots: [BracketSlot, BracketSlot];
  /** The winning team once known; null while undetermined. */
  winner: BracketTeamRef | null;
}

export interface Bracket {
  /** Every knockout match, ordered R32 → Final. */
  matches: BracketMatch[];
  /** The same matches grouped by stage. */
  byStage: Record<KnockoutStage, BracketMatch[]>;
}

// ---- Bracket prediction (a fan's filled-in bracket) ----

/** A fan's picks: knockout match id → the team id picked to win that match. */
export type Prediction = Map<string, number>;

/** How filled-in a prediction is. */
export type PredictionCompleteness = "empty" | "partial" | "complete";

/** The structure derived from a prediction's picks. */
export interface PredictionView {
  completeness: PredictionCompleteness;
  /** matchId → predicted winning team id, for picks that are valid participants. */
  winners: Map<string, number>;
  /** Predicted survivors (winning team ids) of each round. */
  survivorsByStage: Record<KnockoutStage, number[]>;
  /** The predicted champion's team id, present only when the prediction is complete. */
  champion: number | null;
}

// ---- Prediction scoring ----

/**
 * A pick's outcome vs reality:
 *  - `correct` the picked team really won that match
 *  - `wrong`   the picked team reached that match but lost it
 *  - `busted`  the picked team did not (and can no longer) reach that match
 *  - `pending` the match is undecided and the picked team is still alive
 */
export type PickStatus = "pending" | "correct" | "wrong" | "busted";

/** Per-round point weights; later rounds are worth strictly more. */
export type StageWeights = Record<KnockoutStage, number>;

export interface PickScore {
  matchId: string;
  stage: KnockoutStage;
  pickedTeamId: number;
  status: PickStatus;
  /** That round's base weight, before the upset multiplier. */
  roundBase: number;
  /** Picked team's matchup win probability vs. its implied opponent, in [0, 1];
   * `undefined` when no matchup probabilities were supplied. */
  winProb?: number;
  /** Upset multiplier from the underdog band: 1 (favorite/coin-flip), 2 (underdog),
   * 3 (big underdog). Always 1 when no win probability is available. */
  multiplier: 1 | 2 | 3;
  /** Points awarded: `roundBase × multiplier` when `correct`, else 0. */
  pointsEarned: number;
}

export interface PredictionScore {
  picks: PickScore[];
  /** Sum of `roundBase × multiplier` over all `correct` picks. */
  current: number;
  /** `current` plus `roundBase × multiplier` for all still-`pending` picks. */
  maxAchievable: number;
}

// ---- Prediction vs. the model (the "you vs. the model" layer) ----

export interface PickModelInfo {
  matchId: string;
  stage: KnockoutStage;
  pickedTeamId: number;
  /** Model's marginal probability this pick comes true (the picked team reaching
   * the stage that winning this match represents), in [0, 1]. */
  modelProb: number;
  /** Model's head-to-head probability the picked team beats its predicted opponent
   * (0.5 = toss-up), in [0, 1]. Drives boldness and the upset bonus. */
  headToHead: number;
  /** Status vs. reality (from prediction scoring). */
  status: PickStatus;
  /** True when the fan took the head-to-head underdog of this match. */
  bold: boolean;
  /** Upset bonus awarded on top of base points — non-zero only for a `correct`
   * underdog pick, scaled by how big the upset was. */
  upsetBonus: number;
  /** Expected points from this pick under the model: P(comes true) × (base + bonus if correct). */
  expectedPoints: number;
}

export interface ModelComparison {
  picks: PickModelInfo[];
  /** Per-round probability that all picks through that round hold ("as it stands"). */
  survival: Record<KnockoutStage, number>;
  /** Headline "still alive" probability: survival through the Final (a perfect bracket). */
  headlineSurvival: number;
  /** Sum of upset bonuses earned by `correct` underdog picks. */
  upsetBonusCurrent: number;
  /** `upsetBonusCurrent` plus the upset potential of still-`pending` bold picks. */
  upsetBonusMax: number;
  /** Projected (expected) total score from the model: the sum of per-pick expected points. */
  projectedScore: number;
  /** Number of bold (head-to-head underdog) picks. */
  boldnessCount: number;
  /** Share of the fan's picks that are bold, in [0, 1]. */
  boldnessShare: number;
  /** The model's most-likely ("chalk") bracket, for reference. */
  chalk: Prediction;
}
