// GET /api/bracket — current knockout bracket (structure + resolved teams/placeholders
// + winners), baseline champion odds, and lock state. Served from the per-snapshot cache.
import { getBracketData } from "../../../lib/server/predictor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getBracketData();
  return Response.json(data);
}
