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
  /** When provided, the home-advantage boost applies ONLY when the home team is in
   * this set (e.g. tournament hosts on home soil); all other matches are treated as
   * neutral. When omitted, home advantage applies to every home team (legacy). */
  hosts?: Set<number>;
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
  const hosts = opts.hosts;
  const strength = (id: number): number => strengths?.get(id) ?? 1;
  const homeBoost = (homeId: number): number => (!hosts || hosts.has(homeId) ? homeAdvantage : 1);

  return (match, rng) => {
    const homeRate = baseRate * homeBoost(match.homeId) * strength(match.homeId);
    const awayRate = baseRate * strength(match.awayId);
    return [samplePoisson(homeRate, rng), samplePoisson(awayRate, rng)];
  };
}

export interface HeadToHeadOptions {
  baseRate?: number;
  homeAdvantage?: number;
  /** Apply the host home boost to A / B (when that side is a host playing at home). */
  homeIsA?: boolean;
  homeIsB?: boolean;
  /** Max goals summed per side; the tail beyond this is negligible. */
  goalCap?: number;
}

/** Poisson PMF P(0..cap; λ), built iteratively. */
function poissonPmf(lambda: number, cap: number): number[] {
  const out = new Array<number>(cap + 1);
  let p = Math.exp(-lambda);
  out[0] = p;
  for (let k = 1; k <= cap; k++) {
    p = (p * lambda) / k;
    out[k] = p;
  }
  return out;
}

/**
 * Closed-form `P(A beats B)` under the same Poisson model the simulation uses: A
 * outscores B in regulation, plus half the regulation-draw mass (the engine resolves a
 * draw via symmetric extra time then a 50/50 shootout, so a draw is a coin flip). λ is
 * built exactly as `createPoissonModel`'s rate (`baseRate × strength × homeBoost`).
 * Normalized by the summed mass so `P(A)+P(B)=1` exactly despite the goal cap.
 */
export function poissonHeadToHead(strengthA: number, strengthB: number, opts: HeadToHeadOptions = {}): number {
  const baseRate = opts.baseRate ?? DEFAULT_BASE_RATE;
  const homeAdvantage = opts.homeAdvantage ?? DEFAULT_HOME_ADVANTAGE;
  const cap = opts.goalCap ?? 12;
  const pa = poissonPmf(baseRate * strengthA * (opts.homeIsA ? homeAdvantage : 1), cap);
  const pb = poissonPmf(baseRate * strengthB * (opts.homeIsB ? homeAdvantage : 1), cap);

  let aWins = 0;
  let draw = 0;
  let pbBelow = 0; // P(B < a) as a increases
  let sumA = 0;
  let sumB = 0;
  for (let a = 0; a <= cap; a++) {
    aWins += pa[a]! * pbBelow;
    draw += pa[a]! * pb[a]!;
    pbBelow += pb[a]!;
    sumA += pa[a]!;
    sumB += pb[a]!;
  }
  const total = sumA * sumB; // aWins + bWins + draw, normalizing away the truncated tail
  return total > 0 ? (aWins + 0.5 * draw) / total : 0.5;
}
