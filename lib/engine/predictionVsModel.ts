// "You vs. the model" — compare a fan's prediction against the odds engine.
//
// Pure function over a prediction + snapshot. Two seeded simulations yield
// everything: a baseline (pre-knockout) run drives per-pick head-to-head odds,
// per-match boldness, the upset bonus, and the projected (expected) score; a
// live run (real results fixed) drives the survival probability "as it stands".

import type { TournamentSnapshot } from "../data/models";
import type {
  Prediction,
  ModelComparison,
  PickModelInfo,
  StageWeights,
  KnockoutStage,
} from "./types";
import { buildBracket, type R32Projection } from "./bracket";
import { simulate } from "./montecarlo";
import { scorePrediction, DEFAULT_STAGE_WEIGHTS } from "./predictionScore";
import { predictedParticipants } from "./prediction";
import { REACH_BY_WINNING, ORDERED_STAGES } from "./bracketLayout";
import { createPoissonModel, type OutcomeModel } from "./outcome";

/** Default upset-bonus multiplier from a pick's head-to-head probability `h`:
 * zero for favourites (h ≥ 0.5), growing as the underdog lengthens, capped ~9×
 * (head-to-head floored at 5%). */
export const DEFAULT_UPSET_FACTOR = (h: number): number => Math.max(0, 0.5 / Math.max(h, 0.05) - 1);

export interface CompareOptions {
  trials?: number;
  seed?: number;
  model?: OutcomeModel;
  weights?: StageWeights;
  /** Maps a pick's head-to-head probability to its upset-bonus multiplier; must be
   * non-increasing in `h` and zero for h ≥ 0.5. Defaults to a bounded inverse. */
  upsetFactor?: (headToHead: number) => number;
  /** Model projection used to fill the R32 before the real teams are known, so a
   * pick's predicted opponent is known (real results always take precedence). */
  projection?: R32Projection;
}

const pairKey = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** Compare a prediction to the model: per-pick odds, survival, contrarian score, divergence. */
export function compareToModel(
  snapshot: TournamentSnapshot,
  prediction: Prediction,
  opts: CompareOptions = {},
): ModelComparison {
  const weights = opts.weights ?? DEFAULT_STAGE_WEIGHTS;
  const upsetFactor = opts.upsetFactor ?? DEFAULT_UPSET_FACTOR;
  const model = opts.model ?? createPoissonModel();

  const bracket = buildBracket(snapshot, { projection: opts.projection });

  // Baseline (pre-knockout) odds — every knockout match re-simulated — drive the
  // per-pick probabilities, the chalk bracket, and contrarian scoring, so a
  // correctly-called upset still earns the bonus its long odds deserved.
  const baseline = simulate(snapshot, {
    trials: opts.trials,
    seed: opts.seed,
    model,
    playoutKnockout: true,
    ignoreCompletedKnockouts: true,
  });
  // "As it stands" — already-decided real results fixed — drives survival.
  const live = simulate(snapshot, {
    trials: opts.trials,
    seed: opts.seed,
    model,
    playoutKnockout: true,
    prediction,
  });

  const score = scorePrediction(snapshot, prediction, { weights, projection: opts.projection });
  const statusByMatch = new Map(score.picks.map((p) => [p.matchId, p.status]));
  const stageById = new Map(bracket.matches.map((m) => [m.id, m.stage]));

  const trials = baseline.trials;
  const freq = (n: number, t: number): number => (t > 0 ? n / t : 0);

  /** Model's pre-knockout marginal probability that `teamId` wins a match of the given stage. */
  const reachProb = (teamId: number, stage: KnockoutStage): number => {
    const sr = baseline.stageReach.get(teamId);
    return sr ? freq(sr[REACH_BY_WINNING[stage]], trials) : 0;
  };

  // --- Chalk bracket: the model's most-likely path. ---
  const chalk: Prediction = new Map();
  for (const m of bracket.matches) {
    const [a, b] = predictedParticipants(bracket, chalk, m.id);
    if (a === null || b === null) continue;
    chalk.set(m.id, modelFavorite(a, b, m.stage));
  }

  // --- Per-pick info. ---
  const picks: PickModelInfo[] = [];
  let upsetBonusCurrent = 0;
  let upsetBonusMax = 0;
  let projectedScore = 0;
  let boldnessCount = 0;
  for (const [matchId, teamId] of prediction) {
    const stage = stageById.get(matchId);
    if (!stage) continue; // unknown match
    const status = statusByMatch.get(matchId) ?? "pending";
    const modelProb = reachProb(teamId, stage); // P(this pick actually comes true)

    // Head-to-head vs. the predicted opponent → boldness + upset size.
    const [a, b] = predictedParticipants(bracket, prediction, matchId);
    const opponent = teamId === a ? b : a;
    const headToHead = headToHeadProb(teamId, opponent, stage);
    const bold = headToHead < 0.5;

    const base = weights[stage];
    const bonusIfCorrect = bold ? base * upsetFactor(headToHead) : 0;
    const upsetBonus = status === "correct" ? bonusIfCorrect : 0;
    const expectedPoints = modelProb * (base + bonusIfCorrect);

    upsetBonusCurrent += upsetBonus;
    if (status === "correct" || status === "pending") upsetBonusMax += bonusIfCorrect;
    projectedScore += expectedPoints;
    if (bold) boldnessCount++;

    picks.push({ matchId, stage, pickedTeamId: teamId, modelProb, headToHead, status, bold, upsetBonus, expectedPoints });
  }

  const survival: Record<KnockoutStage, number> = { R32: 0, R16: 0, QF: 0, SF: 0, F: 0 };
  for (const stage of ORDERED_STAGES) survival[stage] = freq(live.survivalByStage[stage], live.trials);

  return {
    picks,
    survival,
    headlineSurvival: survival.F,
    upsetBonusCurrent,
    upsetBonusMax,
    projectedScore,
    boldnessCount,
    boldnessShare: prediction.size > 0 ? boldnessCount / prediction.size : 0,
    chalk,
  };

  /** Model's head-to-head probability that `team` beats `opponent` in this match
   * (matchup-conditional where observed, else normalized marginals). */
  function headToHeadProb(team: number, opponent: number | null, stage: KnockoutStage): number {
    if (opponent === null) return 0.5; // opponent not yet determined → treat as a toss-up
    const mc = baseline.matchups.get(pairKey(team, opponent));
    if (mc && mc.meetings > 0) {
      return mc.lowId === team ? mc.lowWins / mc.meetings : 1 - mc.lowWins / mc.meetings;
    }
    const mt = reachProb(team, stage);
    const mo = reachProb(opponent, stage);
    return mt + mo > 0 ? mt / (mt + mo) : 0.5;
  }

  /** The participant the model rates more likely to win this match. */
  function modelFavorite(a: number, b: number, stage: KnockoutStage): number {
    const mc = baseline.matchups.get(pairKey(a, b));
    if (mc && mc.meetings > 0) {
      const aWin = mc.lowId === a ? mc.lowWins / mc.meetings : 1 - mc.lowWins / mc.meetings;
      return aWin >= 0.5 ? a : b;
    }
    // Fall back to marginal reach when the pairing wasn't observed.
    return reachProb(a, stage) >= reachProb(b, stage) ? a : b;
  }
}
