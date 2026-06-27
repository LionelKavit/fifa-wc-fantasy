// POST /api/predictor/pool-finish — body { picks: [matchId, teamId][], poolSize: number }.
// Returns the "will this win my pool?" verdict: the user's win probability, projected
// finish, and points range, plus the chalk reference. Incomplete brackets return
// { complete: false }. The Monte Carlo runs here, server-side, never in the browser.
import { poolVerdict } from "../../../../lib/server/predictor";

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
  const poolSize = (body as { poolSize?: unknown })?.poolSize;
  const picksOk =
    Array.isArray(picks) && picks.every((p) => Array.isArray(p) && typeof p[0] === "string" && typeof p[1] === "number");
  if (!picksOk || typeof poolSize !== "number" || !Number.isFinite(poolSize) || poolSize < 1) {
    return Response.json({ error: "Expected { picks: [matchId, teamId][], poolSize: number >= 1 }" }, { status: 400 });
  }

  try {
    const verdict = await poolVerdict(picks as [string, number][], Math.floor(poolSize));
    return Response.json(verdict);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Verdict failed" }, { status: 400 });
  }
}
