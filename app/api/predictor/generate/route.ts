// POST /api/predictor/generate — body { poolSize, risk, seed?, strategy? }.
// Returns { picks: [matchId, teamId][] } — a complete, grounded bracket the user can
// then tweak. "heuristic" (default) is the fast generator; "leverage" maximizes pool-win
// probability (slower). The generation runs server-side, grounded in the model.
import { generatePrediction, type GenerationStrategy } from "../../../../lib/server/predictor";
import type { RiskLevel } from "../../../../lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RISKS: RiskLevel[] = ["safe", "balanced", "bold"];
const STRATEGIES: GenerationStrategy[] = ["heuristic", "leverage"];

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const poolSize = (body as { poolSize?: unknown })?.poolSize;
  const risk = (body as { risk?: unknown })?.risk;
  if (typeof poolSize !== "number" || !Number.isFinite(poolSize) || poolSize < 1 || !RISKS.includes(risk as RiskLevel)) {
    return Response.json({ error: 'Expected { poolSize: number >= 1, risk: "safe"|"balanced"|"bold" }' }, { status: 400 });
  }
  // Optional seed for variety ("Regenerate"); a non-finite seed is ignored.
  const rawSeed = (body as { seed?: unknown })?.seed;
  const seed = typeof rawSeed === "number" && Number.isFinite(rawSeed) ? rawSeed : undefined;
  // Optional strategy; unknown values fall back to the default heuristic.
  const rawStrategy = (body as { strategy?: unknown })?.strategy;
  const strategy = STRATEGIES.includes(rawStrategy as GenerationStrategy) ? (rawStrategy as GenerationStrategy) : "heuristic";
  // Optional current picks to KEEP — the generator completes the bracket from them (fills
  // the gaps). Validated leniently; anything malformed is ignored (treated as no picks).
  const rawPicks = (body as { picks?: unknown })?.picks;
  const current =
    Array.isArray(rawPicks)
      ? rawPicks.filter((p): p is [string, number] => Array.isArray(p) && typeof p[0] === "string" && typeof p[1] === "number")
      : undefined;

  try {
    const picks = await generatePrediction(Math.floor(poolSize), risk as RiskLevel, seed, strategy, current);
    return Response.json({ picks });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Generation failed" }, { status: 400 });
  }
}
