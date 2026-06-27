// Shared, pure verdict-sentence helper. Used by the client for the immediate render
// and by the server as the deterministic fallback when the Analyst note is keyless or
// fails — one source of truth for the wording.

export interface PointsRange {
  p10: number;
  p50: number;
  p90: number;
  mean: number;
}

/** The numbers behind the verdict card, the facts a verdict sentence may reference. */
export interface VerdictFacts {
  winProbability: number;
  chalkWinProbability: number;
  expectedFinish: number;
  poolSize: number;
  pointsRange: PointsRange;
}

/** A deterministic, plain-language read of the verdict — no LLM. */
export function templateVerdict(facts: VerdictFacts): string {
  const { winProbability: winProb, chalkWinProbability: chalkWinProb, poolSize } = facts;
  const odds =
    winProb < 0.05 ? "A long shot" : winProb < 0.15 ? "A live shot" : winProb < 0.34 ? "A real contender" : "The bracket to beat";
  const vsChalk =
    winProb > chalkWinProb * 1.1
      ? "better than just picking favorites"
      : winProb < chalkWinProb * 0.9
        ? "worse than playing chalk"
        : "about the same as playing chalk";
  return `${odds} to win your pool of ${poolSize} — ${vsChalk}.`;
}
