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
