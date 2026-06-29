// Typed domain models — the ONLY interface downstream code (engine, LLM, UI) uses.
// Raw endpoint shapes stay private to this layer (see schema.ts).

export type Position = "GK" | "DEF" | "MID" | "FWD";

/** Tournament round stage, in chronological order. */
export type Stage = "GROUP" | "R32" | "R16" | "QF" | "SF" | "F";

/** Normalized fixture status. The raw feed only emits complete/scheduled today; any
 * other per-fixture status (e.g. an in-progress match) is normalized to `live`. */
export type FixtureStatus = "complete" | "live" | "scheduled";

/** Group id, lowercase letter a–l. */
export type GroupId = string;

export interface Team {
  /** 1–48; joins directly to player.teamId (raw players[].squadId). */
  id: number;
  name: string;
  abbr: string;
  group: GroupId;
  isEliminated: boolean;
}

export interface Group {
  id: GroupId;
  /** Exactly 4 teams. */
  teams: Team[];
}

export interface Player {
  id: number;
  /** knownName when present, else "firstName lastName". */
  name: string;
  firstName: string | null;
  lastName: string | null;
  knownName: string | null;
  teamId: number;
  position: Position;
  price: number;
  status: string;
  /** percentSelected ownership. */
  ownership: number;
  form: number;
  totalPoints: number;
}

/** A single goal in a fixture. For an own goal, `playerId` is the player who put it into
 * their own net (credited to the opposing side's score); such goals are excluded from a
 * player's scorer tally. `assistId` is null when unassisted. */
export interface GoalEvent {
  playerId: number;
  assistId: number | null;
  isOwnGoal: boolean;
}

export interface Fixture {
  id: number;
  roundId: number;
  stage: Stage;
  status: FixtureStatus;
  /** ISO kickoff datetime. */
  kickoff: string;
  homeTeamId: number;
  awayTeamId: number;
  /** Null until the match has a score. */
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  /** Goal events (home then away). Always populated by `normalize` (empty when the feed
   * provides none); optional so lightweight test fixtures need not set it. */
  goals?: GoalEvent[];
}

export interface Round {
  id: number;
  stage: Stage;
  status: string;
  startDate: string;
  endDate: string;
}

/** A consistent, point-in-time view built from one coherent fetch cycle. */
export interface TournamentSnapshot {
  fetchedAt: string;
  teams: Team[];
  groups: Group[];
  players: Player[];
  rounds: Round[];
  fixtures: Fixture[];
}
