// Risk level for the bracket generator + a pool-size-based recommendation. Kept in
// its own dependency-free module so the client can import the recommendation without
// pulling the Monte Carlo engine into the browser bundle.

export type RiskLevel = "safe" | "balanced" | "bold";

export interface RiskRecommendation {
  risk: RiskLevel;
  rationale: string;
}

/** Recommend a risk level from the pool size: small pools win on chalk, big pools need upsets. */
export function recommendRisk(poolSize: number): RiskRecommendation {
  if (poolSize <= 8) return { risk: "safe", rationale: "Chalk usually wins a small pool — play it safe." };
  if (poolSize <= 30) return { risk: "balanced", rationale: "A mid-size pool rewards a few smart upsets." };
  return { risk: "bold", rationale: "Big pool — you need bold calls to stand out." };
}
