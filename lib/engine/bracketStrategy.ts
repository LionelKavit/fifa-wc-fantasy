// Bracket strategy: turn the model evaluation into pool-winning advice. Winning a
// pool isn't about raw accuracy — it's about the right amount of differentiation
// for the field size. This assesses how bold a bracket is versus a pool-size target
// and proposes concrete swaps (favourite↔underdog) with grounded rationale. Pure:
// arithmetic over the per-pick numbers `compareToModel` already produced.

import type { TournamentSnapshot } from "../data/models";
import type { Bracket, Prediction, ModelComparison, KnockoutStage, StageWeights } from "./types";
import { DEFAULT_STAGE_WEIGHTS } from "./predictionScore";
import { predictedParticipants } from "./prediction";

export type StrategyVerdict = "too-safe" | "balanced" | "too-risky";

export interface SwapSuggestion {
  matchId: string;
  stage: KnockoutStage;
  dropTeamId: number;
  takeTeamId: number;
  dropAbbr: string;
  takeAbbr: string;
  /** Model head-to-head probability the suggested 'take' team wins this match. */
  takeWinProb: number;
  rationale: string;
}

export interface StrategyAssessment {
  poolSize: number;
  boldCount: number;
  /** Healthy band of bold (underdog) picks for this pool size. */
  targetLow: number;
  targetHigh: number;
  verdict: StrategyVerdict;
  summary: string;
  swaps: SwapSuggestion[];
}

const STAGE_NAME: Record<KnockoutStage, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "quarterfinal",
  SF: "semifinal",
  F: "final",
};

const pct = (p: number): string => `${Math.round(p * 100)}%`;

/** Healthy number of bold picks scales with pool size: bigger field → more
 * differentiation needed to finish first. */
function boldTarget(poolSize: number): { low: number; high: number } {
  const target = Math.round(Math.log2(Math.max(2, poolSize)));
  return { low: Math.max(0, target - 1), high: target + 1 };
}

export interface StrategyOptions {
  weights?: StageWeights;
  maxSwaps?: number;
}

/**
 * Assess a prediction's pool fit and suggest swaps. Reuses the `compareToModel`
 * result (per-pick boldness + head-to-head); proposes only valid participants.
 */
export function analyzeStrategy(
  snapshot: TournamentSnapshot,
  bracket: Bracket,
  prediction: Prediction,
  comparison: ModelComparison,
  poolSize: number,
  opts: StrategyOptions = {},
): StrategyAssessment {
  const weights = opts.weights ?? DEFAULT_STAGE_WEIGHTS;
  const maxSwaps = opts.maxSwaps ?? 3;
  const size = Math.max(1, Math.round(poolSize));
  const { low, high } = boldTarget(size);
  const boldCount = comparison.boldnessCount;
  const verdict: StrategyVerdict = boldCount < low ? "too-safe" : boldCount > high ? "too-risky" : "balanced";

  const abbrOf = (id: number) => snapshot.teams.find((t) => t.id === id)?.abbr ?? `#${id}`;

  const scored: (SwapSuggestion & { score: number })[] = [];
  if (verdict !== "balanced") {
    for (const p of comparison.picks) {
      const [a, b] = predictedParticipants(bracket, prediction, p.matchId);
      const other = p.pickedTeamId === a ? b : p.pickedTeamId === b ? a : null;
      if (other === null) continue;
      const w = weights[p.stage];
      const otherH2H = 1 - p.headToHead; // the alternative team's head-to-head prob

      if (verdict === "too-safe" && !p.bold) {
        // Switch a favourite to the match's underdog — prefer live underdogs in big rounds.
        const score = otherH2H * w;
        scored.push({
          matchId: p.matchId,
          stage: p.stage,
          dropTeamId: p.pickedTeamId,
          takeTeamId: other,
          dropAbbr: abbrOf(p.pickedTeamId),
          takeAbbr: abbrOf(other),
          takeWinProb: otherH2H,
          score,
          rationale: `${abbrOf(other)} is a live underdog in the ${STAGE_NAME[p.stage]} (model gives them ${pct(otherH2H)}); backing them over ${abbrOf(p.pickedTeamId)} differentiates your bracket where it counts.`,
        });
      } else if (verdict === "too-risky" && p.bold) {
        // Revert a long-shot upset pick to the favourite — worst odds in big rounds first.
        const score = (0.5 - p.headToHead) * w;
        scored.push({
          matchId: p.matchId,
          stage: p.stage,
          dropTeamId: p.pickedTeamId,
          takeTeamId: other,
          dropAbbr: abbrOf(p.pickedTeamId),
          takeAbbr: abbrOf(other),
          takeWinProb: otherH2H,
          score,
          rationale: `${abbrOf(p.pickedTeamId)} is a long shot in the ${STAGE_NAME[p.stage]} (model gives them only ${pct(p.headToHead)}); ${abbrOf(other)} is the safer call.`,
        });
      }
    }
  }

  scored.sort((x, y) => y.score - x.score);
  const swaps = scored.slice(0, maxSwaps).map(({ score: _score, ...s }) => s);

  let summary: string;
  if (verdict === "too-safe") {
    summary = `Your bracket has ${boldCount} upset pick${boldCount === 1 ? "" : "s"} — light for a ${size}-person pool, where chalk usually ties the field. Add some differentiation:`;
  } else if (verdict === "too-risky") {
    summary = `Your bracket has ${boldCount} upset picks — risky for a ${size}-person pool; you don't need that much variance to win. Consider safer picks:`;
  } else {
    summary = `Your ${boldCount} upset pick${boldCount === 1 ? "" : "s"} look well-balanced for a ${size}-person pool.`;
  }

  return { poolSize: size, boldCount, targetLow: low, targetHigh: high, verdict, summary, swaps };
}
