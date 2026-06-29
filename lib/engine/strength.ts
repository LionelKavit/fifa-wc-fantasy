// Derive Poisson per-team strength multipliers from World Football Elo ratings.
// strength = exp(K · (elo − mean) / 400): the average team is ≈ 1, stronger teams
// scale up, weaker down. Feeds the injectable `strengths` hook of the outcome model.

import type { TournamentSnapshot } from "../data/models";

/** Strength-spread tuning. Higher K → bigger gap between strong and weak teams. */
export const DEFAULT_ELO_K = 1;

/** WC 2026 host nations (home-advantage applies only to these, on home soil). */
export const HOST_ABBRS = new Set(["USA", "MEX", "CAN"]);

/** Build a teamId → strength-multiplier map from id → Elo ratings (mean ≈ 1.0). */
export function eloStrengths(ratings: Record<number, number> | Map<number, number>, k: number = DEFAULT_ELO_K): Map<number, number> {
  const entries: [number, number][] =
    ratings instanceof Map ? [...ratings] : Object.entries(ratings).map(([id, elo]) => [Number(id), elo]);
  if (entries.length === 0) return new Map();
  const mean = entries.reduce((s, [, elo]) => s + elo, 0) / entries.length;
  return new Map(entries.map(([id, elo]) => [id, Math.exp((k * (elo - mean)) / 400)]));
}

/** Team ids of the host nations present in the snapshot. */
export function hostTeamIds(snapshot: TournamentSnapshot): Set<number> {
  return new Set(snapshot.teams.filter((t) => HOST_ABBRS.has(t.abbr)).map((t) => t.id));
}
