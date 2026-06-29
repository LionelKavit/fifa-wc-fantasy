// Unified app: one page, two tabs (Knockouts + Group stage) with a single Analyst
// chat. Server component: resolves the group data from the cached provider and
// passes the rendered group panel to the client AppShell (which hosts the tabs,
// the shared chat, and the client-fetched bracket).
import { getTournamentData } from "../lib/server/tournament";
import { buildGroupSituation } from "../lib/grounding";
import GroupCard, { type GroupView } from "./components/GroupCard";
import AppShell from "./components/AppShell";
import LiveRefresher from "./components/LiveRefresher";
import { completedResultsFor } from "./components/teamResults";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { snapshot, report, live } = await getTournamentData();

  const groups: GroupView[] = snapshot.groups
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((g) => {
      const s = buildGroupSituation(snapshot, g.id, report, { provisional: live });
      return {
        groupId: g.id,
        narration: s.narration,
        liveFixtures: s.liveFixtures,
        teams: s.teams.map((t) => ({
          teamId: t.teamId,
          abbr: t.abbr,
          name: t.name,
          rank: t.rank,
          played: t.played,
          goalDifference: t.goalDifference,
          points: t.points,
          advancement: t.advancement,
          advancementProbability: t.advancementProbability,
          conditional: t.conditionalProbability,
          narration: t.narration,
          results: completedResultsFor(snapshot, t.teamId),
        })),
      };
    });

  const groupPanel = (
    <div>
      <LiveRefresher live={live} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {groups.map((g) => (
          <GroupCard key={g.groupId} group={g} />
        ))}
      </div>
    </div>
  );

  return <AppShell groupPanel={groupPanel} />;
}
