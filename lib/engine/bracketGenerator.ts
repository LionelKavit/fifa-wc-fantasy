// Bracket generator — fill a complete, grounded bracket for the user.
//
// Start from chalk (the Elo favorite at every match), then spend a "boldness budget"
// of upsets — sized by the risk level and pool size — on the highest-VALUE upsets,
// where value = plausibility (the underdog's COMPOUNDED probability of actually winning
// that match, so deep upsets need a realistically-reaching team) × differentiation (how
// contrarian the pick is vs. the chalk field). No round-scoring weights, so it doesn't
// stat-pad against our scheme. Built top-down in two passes so the result is always
// feasible. Pure and seeded: identical inputs reproduce exactly.

import type { TournamentSnapshot } from "../data/models";
import type { Prediction, KnockoutStage } from "./types";
import { buildBracket, type R32Projection } from "./bracket";
import { predictedParticipants } from "./prediction";
import { DEFAULT_STAGE_WEIGHTS, UPSET_MULTIPLIER_CUTOFFS, upsetMultiplier, type UpsetCutoffs } from "./predictionScore";
import { mulberry32 } from "./rng";
import { PUBLIC_CHALK_GAMMA, type MatchupWinProb } from "./poolFinish";
import type { RiskLevel } from "./risk";

export { recommendRisk, type RiskLevel, type RiskRecommendation } from "./risk";

/** Marginal probability a team wins a match at the given stage in reality (≡ reaching
 * the next stage). Compounds down with depth — the plausibility of an upset. */
export type StageWinProb = (teamId: number, stage: KnockoutStage) => number;

export interface GenerateBracketOptions {
  /** P(a beats b) — the model's head-to-head, for favorites and the contrarian term. */
  matchupWinProb: MatchupWinProb;
  risk: RiskLevel;
  poolSize: number;
  /** Marginal compounded reach-and-win probabilities — the plausibility term of upset
   * value. When omitted, the generator falls back to a conditional weighting. */
  stageWinProb?: StageWinProb;
  /** Projection used to fill the R32 before the real draw, so the bracket has a field. */
  projection?: R32Projection;
  cutoffs?: UpsetCutoffs;
  seed?: number;
  /** Expert-signal team ids to lean into as upsets (boosts their upset value). */
  favor?: Set<number>;
  /** Expert-signal favorite team ids to be wary of (boosts upsetting their match). */
  fade?: Set<number>;
  /** Already-made picks to KEEP (a partial, path-consistent prediction). The generator
   * completes the bracket from these — keeping each valid pick and deciding only the
   * unset matches. Omit (or pass empty) to generate from scratch. */
  locked?: Prediction;
}

/** Multiplicative value boost for upsets matching an expert signal (re-ranks candidates;
 * empty signals leave the value untouched, so the bracket is unchanged). */
const SIGNAL_BIAS = 1.5;

/** Seeded ± jitter on candidate value, so a new seed ("Regenerate") yields a different
 * bracket. Kept small enough that round ordering (≥2× gaps) and the 1.5× favor/fade bias
 * still dominate — only near-equal candidates get reshuffled. */
const VALUE_JITTER = 0.15;

/** How many upsets to introduce, by risk and pool size. Monotonic: safe ≤ balanced ≤
 * bold, and a larger pool never takes fewer (more differentiation needed to win). */
function boldnessBudget(risk: RiskLevel, poolSize: number): number {
  if (risk === "safe") return 0;
  const base = risk === "bold" ? 6 : 3;
  const poolBump = poolSize >= 50 ? 2 : poolSize >= 16 ? 1 : 0;
  return base + poolBump;
}

/** Generate a complete, feasible bracket calibrated to risk and pool size. */
export function generateBracket(snapshot: TournamentSnapshot, opts: GenerateBracketOptions): Prediction {
  const { matchupWinProb, risk, poolSize } = opts;
  const cutoffs = opts.cutoffs ?? UPSET_MULTIPLIER_CUTOFFS;
  const rng = mulberry32(opts.seed ?? 1);
  const bracket = buildBracket(snapshot, { projection: opts.projection });
  const locked = opts.locked;

  // Pass 1: baseline (a kept pick where valid, favorite elsewhere) + score each OPEN
  // match's upset opportunity. A locked pick is fixed and never a budget candidate; a
  // locked underdog counts toward the boldness already in the bracket.
  const base: Prediction = new Map();
  const candidates: { matchId: string; value: number; tie: number }[] = [];
  let lockedUpsets = 0;
  for (const m of bracket.matches) {
    const [a, b] = predictedParticipants(bracket, base, m.id);
    if (a === null || b === null) continue;
    const pa = matchupWinProb(a, b);
    const favorite = pa >= 0.5 ? a : b;
    const underdog = pa >= 0.5 ? b : a;
    const lockedTeam = locked?.get(m.id);
    if (lockedTeam === a || lockedTeam === b) {
      base.set(m.id, lockedTeam); // keep the user's pick (valid participant)
      if (lockedTeam === underdog) lockedUpsets++;
      continue;
    }
    base.set(m.id, favorite);
    const pUnderdog = Math.min(pa, 1 - pa);
    const multiplier = upsetMultiplier(pUnderdog, cutoffs);
    if (multiplier >= 2) {
      // Expected-differentiation value: how likely the upset truly comes true × how
      // contrarian it is vs. the chalk field. No round-scoring weights — depth matters
      // only via the (lower) compounded probability of deep upsets.
      let value: number;
      if (opts.stageWinProb) {
        const plausibility = opts.stageWinProb(underdog, m.stage); // compounded reach-and-win
        const share = pUnderdog ** PUBLIC_CHALK_GAMMA / (pUnderdog ** PUBLIC_CHALK_GAMMA + (1 - pUnderdog) ** PUBLIC_CHALK_GAMMA);
        value = plausibility * (1 - share); // differentiation = field unlikely to have it
      } else {
        // Fallback (no reach odds supplied): the prior conditional weighting.
        value = DEFAULT_STAGE_WEIGHTS[m.stage] * multiplier * pUnderdog;
      }
      // Expert signals re-rank candidates; empty signals leave value untouched.
      if (opts.favor?.has(underdog)) value *= SIGNAL_BIAS;
      if (opts.fade?.has(favorite)) value *= SIGNAL_BIAS;
      value *= 1 + (rng() - 0.5) * 2 * VALUE_JITTER; // seeded variety for "Regenerate"
      candidates.push({ matchId: m.id, value, tie: rng() });
    }
  }

  // Budget counts the upsets already locked in, so the whole bracket honors the risk/pool
  // target; only the remainder is spent on the open matches. Locked picks are never undone.
  const remaining = Math.max(0, boldnessBudget(risk, poolSize) - lockedUpsets);
  const budget = Math.min(remaining, candidates.length);
  const selected = new Set(
    candidates.sort((x, y) => y.value - x.value || x.tie - y.tie).slice(0, budget).map((c) => c.matchId),
  );

  // Pass 2: keep each valid locked pick; apply the selected upsets; favorites elsewhere.
  // Re-resolving participants each step keeps the bracket feasible when a pick changes who
  // advances. A locked pick that is no longer a valid participant is decided normally.
  const result: Prediction = new Map();
  for (const m of bracket.matches) {
    const [a, b] = predictedParticipants(bracket, result, m.id);
    if (a === null || b === null) continue;
    const pa = matchupWinProb(a, b);
    const favorite = pa >= 0.5 ? a : b;
    const underdog = pa >= 0.5 ? b : a;
    const lockedTeam = locked?.get(m.id);
    if (lockedTeam === a || lockedTeam === b) result.set(m.id, lockedTeam);
    else result.set(m.id, selected.has(m.id) ? underdog : favorite);
  }
  return result;
}
