// Group dashboard + Scout chat. Server component: resolves grounded data directly
// from the cached provider (no client fetch waterfall) and renders it. The chat
// panel is a client island that streams from /api/chat.
import { getTournamentData } from "../lib/server/tournament";
import { buildGroupSituation } from "../lib/grounding";
import GroupCard, { type GroupView } from "./components/GroupCard";
import ScoutChat from "./components/ScoutChat";
import { completedResultsFor } from "./components/teamResults";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { snapshot, report } = await getTournamentData();

  const groups: GroupView[] = snapshot.groups
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((g) => {
      const s = buildGroupSituation(snapshot, g.id, report);
      return {
        groupId: g.id,
        narration: s.narration,
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

  const through = groups.flatMap((g) => g.teams).filter((t) => t.advancement === "clinched").length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* gold · teal · orange accent */}
      <div className="mx-auto mb-6 h-1 w-24 rounded-full bg-gradient-to-r from-teal-400 via-amber-400 to-orange-500" />
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
          <span aria-hidden>⚽️</span> Pocket Scout{" "}
          <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-teal-300 bg-clip-text text-transparent">
            · World Cup 2026
          </span>
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">
          Live group-stage qualification scenarios — who's through, who's out, and every team's odds.
          <span className="ml-1 text-slate-500">{through} teams already through.</span>
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {groups.map((g) => (
            <GroupCard key={g.groupId} group={g} />
          ))}
        </div>

        <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <ScoutChat />
        </aside>
      </div>
    </main>
  );
}
