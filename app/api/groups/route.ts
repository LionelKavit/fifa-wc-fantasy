// GET /api/groups — all 12 groups with ordered standings + per-team advancement status.
import { getTournamentData } from "../../../lib/server/tournament";
import { buildGroupSituation } from "../../../lib/grounding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { snapshot, report } = await getTournamentData();
  const groups = snapshot.groups.map((g) => {
    const s = buildGroupSituation(snapshot, g.id, report);
    return {
      groupId: g.id,
      narration: s.narration,
      table: s.table.map((r) => ({
        rank: r.rank,
        teamId: r.teamId,
        abbr: r.abbr,
        name: r.name,
        played: r.played,
        goalDifference: r.goalDifference,
        points: r.points,
      })),
      teams: s.teams.map((t) => ({
        teamId: t.teamId,
        abbr: t.abbr,
        advancement: t.advancement,
        advancementProbability: t.advancementProbability,
      })),
    };
  });

  return Response.json({ fetchedAt: snapshot.fetchedAt, groups });
}
