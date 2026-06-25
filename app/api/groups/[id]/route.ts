// GET /api/groups/[id] — one group's grounded situation. 404 on unknown id.
import { getTournamentData } from "../../../../lib/server/tournament";
import { buildGroupSituation } from "../../../../lib/grounding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { snapshot, report, live } = await getTournamentData();

  if (!snapshot.groups.some((g) => g.id === id)) {
    return Response.json({ error: `Unknown group '${id}'` }, { status: 404 });
  }

  return Response.json(buildGroupSituation(snapshot, id, report, { provisional: live }));
}
