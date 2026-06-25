// Per-fixture outcome model. The simulation calls this to turn a remaining
// fixture into a sampled scoreline. The model is injectable so it can later be
// upgraded (ratings, xG) without touching the Monte Carlo loop.

import { samplePoisson, type Rng } from "./rng";

export interface FixtureMatchup {
  homeId: number;
  awayId: number;
}

/** Samples a [homeGoals, awayGoals] scoreline for a fixture. */
export type OutcomeModel = (match: FixtureMatchup, rng: Rng) => [number, number];

export interface PoissonModelOptions {
  /** Expected goals for a neutral team in a neutral match. */
  baseRate?: number;
  /** Multiplicative boost applied to the home side's scoring rate. */
  homeAdvantage?: number;
  /** Per-team attacking strength multiplier (teamId → factor). Absent teams
   * default to 1 (neutral), so the model is unbiased without a ratings source. */
  strengths?: Map<number, number>;
}

const DEFAULT_BASE_RATE = 1.3;
const DEFAULT_HOME_ADVANTAGE = 1.15;

/**
 * Baseline outcome model: each side's goals are drawn from an independent
 * Poisson distribution. The home side's rate is boosted by `homeAdvantage`.
 * With default (neutral) strengths the only asymmetry is home advantage.
 */
export function createPoissonModel(opts: PoissonModelOptions = {}): OutcomeModel {
  const baseRate = opts.baseRate ?? DEFAULT_BASE_RATE;
  const homeAdvantage = opts.homeAdvantage ?? DEFAULT_HOME_ADVANTAGE;
  const strengths = opts.strengths;
  const strength = (id: number): number => strengths?.get(id) ?? 1;

  return (match, rng) => {
    const homeRate = baseRate * homeAdvantage * strength(match.homeId);
    const awayRate = baseRate * strength(match.awayId);
    return [samplePoisson(homeRate, rng), samplePoisson(awayRate, rng)];
  };
}
