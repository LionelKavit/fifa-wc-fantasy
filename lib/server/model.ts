// Builds the Elo-backed outcome model for the simulation: per-team strength from
// the committed ratings snapshot + host-only home advantage. Server-side so the
// ratings JSON is bundled once; the engine stays pure and just receives the model.

import { createPoissonModel, eloStrengths, hostTeamIds, type OutcomeModel } from "../engine";
import type { TournamentSnapshot } from "../data";
import ratingsData from "../data/ratings.json";

const STRENGTHS = eloStrengths(ratingsData.ratings as Record<string, number>);

/** Elo-strength Poisson model with home advantage limited to the host nations. */
export function buildOutcomeModel(snapshot: TournamentSnapshot): OutcomeModel {
  return createPoissonModel({ strengths: STRENGTHS, hosts: hostTeamIds(snapshot) });
}
