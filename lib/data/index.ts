// Public entry point for the data-ingestion layer. Downstream code (engine, LLM,
// UI) imports ONLY from here and receives typed domain models — never raw shapes.

import {
  fetchPlayers,
  fetchSquads,
  fetchRounds,
  type FetchOptions,
} from "./endpoints";
import { normalize } from "./normalize";
import type { TournamentSnapshot } from "./models";

/**
 * Load a consistent point-in-time tournament snapshot from one coherent fetch
 * cycle: teams (48), groups (12×4), players, rounds, and fixtures.
 */
export async function loadTournamentSnapshot(
  opts: FetchOptions = {},
): Promise<TournamentSnapshot> {
  const [players, squads, rounds] = await Promise.all([
    fetchPlayers(opts),
    fetchSquads(opts),
    fetchRounds(opts),
  ]);
  return normalize({ players, squads, rounds }, new Date().toISOString());
}

export type {
  TournamentSnapshot,
  Team,
  Group,
  Player,
  Round,
  Fixture,
  GoalEvent,
  FixtureStatus,
  Position,
  Stage,
  GroupId,
} from "./models";

export { clearCache, FetchError, DEFAULT_TTL_MS, type FetchOptions } from "./endpoints";
export { NormalizationError } from "./normalize";
export { DataValidationError } from "./schema";
