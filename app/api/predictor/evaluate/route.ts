// POST /api/predictor/evaluate — body { picks: [matchId, teamId][] }.
// Returns the prediction's scoring + model comparison (survival, contrarian, divergence).
// The Monte Carlo runs here, server-side, never in the browser.
import { evaluatePrediction } from "../../../../lib/server/predictor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const picks = (body as { picks?: unknown })?.picks;
  if (!Array.isArray(picks) || !picks.every((p) => Array.isArray(p) && typeof p[0] === "string" && typeof p[1] === "number")) {
    return Response.json({ error: "Expected { picks: [matchId, teamId][] }" }, { status: 400 });
  }

  try {
    const result = await evaluatePrediction(picks as [string, number][]);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Evaluation failed" }, { status: 400 });
  }
}
