// Pure helper: a team's completed World Cup fixtures (full-time scores), from
// that team's perspective. Used by the team detail dialog.
import type { TournamentSnapshot } from "../../lib/data";

export interface TeamResult {
  opponentId: number;
  opponentAbbr: string;
  opponentName: string;
  home: boolean;
  teamScore: number;
  opponentScore: number;
  result: "W" | "D" | "L";
  kickoff: string;
}

export function completedResultsFor(snapshot: TournamentSnapshot, teamId: number): TeamResult[] {
  const teamById = new Map(snapshot.teams.map((t) => [t.id, t]));
  const results: TeamResult[] = [];

  for (const f of snapshot.fixtures) {
    if (f.status !== "complete" || f.homeScore === null || f.awayScore === null) continue;
    if (f.homeTeamId !== teamId && f.awayTeamId !== teamId) continue;

    const home = f.homeTeamId === teamId;
    const teamScore = home ? f.homeScore : f.awayScore;
    const opponentScore = home ? f.awayScore : f.homeScore;
    const opponentId = home ? f.awayTeamId : f.homeTeamId;
    const opponent = teamById.get(opponentId);

    results.push({
      opponentId,
      opponentAbbr: opponent?.abbr ?? "???",
      opponentName: opponent?.name ?? "Unknown",
      home,
      teamScore,
      opponentScore,
      result: teamScore > opponentScore ? "W" : teamScore < opponentScore ? "L" : "D",
      kickoff: f.kickoff,
    });
  }

  return results.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}
