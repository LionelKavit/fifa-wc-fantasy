// Current-tournament scorers, derived from the live snapshot's goal events, plus a live
// all-time scoring record that augments the committed (through-2022) history with 2026
// goals. Pure: a deterministic function of the snapshot (+ static history). These are
// descriptive color only — they never feed WC2026 odds, finishes, or picks.

import type { TournamentSnapshot } from "../data/models";
import { topScorers, resolveNation } from "./worldCupHistory";

export interface CurrentScorer {
  playerId: number;
  name: string;
  nation: string;
  goals: number;
  assists: number;
}

/** Diacritic-insensitive, lowercased last token of a name (e.g. "Kylian Mbappé" → "mbappe"). */
function lastToken(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/** Top scorers of the current tournament so far: goals (own goals excluded) and assists
 * per player, joined to nation, ranked by goals then assists then name. */
export function currentTopScorers(snapshot: TournamentSnapshot, limit?: number): CurrentScorer[] {
  const goals = new Map<number, number>();
  const assists = new Map<number, number>();
  for (const f of snapshot.fixtures) {
    for (const g of f.goals ?? []) {
      if (!g.isOwnGoal) goals.set(g.playerId, (goals.get(g.playerId) ?? 0) + 1);
      if (g.assistId !== null) assists.set(g.assistId, (assists.get(g.assistId) ?? 0) + 1);
    }
  }
  const playerById = new Map(snapshot.players.map((p) => [p.id, p]));
  const teamById = new Map(snapshot.teams.map((t) => [t.id, t]));
  const scorers: CurrentScorer[] = [];
  for (const [playerId, g] of goals) {
    if (g <= 0) continue;
    const p = playerById.get(playerId);
    scorers.push({
      playerId,
      name: p?.name ?? `#${playerId}`,
      nation: p ? (teamById.get(p.teamId)?.name ?? "Unknown") : "Unknown",
      goals: g,
      assists: assists.get(playerId) ?? 0,
    });
  }
  scorers.sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name));
  return limit && limit > 0 ? scorers.slice(0, limit) : scorers;
}

export interface CareerScorer {
  player: string;
  nation: string;
  careerGoals: number;
  historicalGoals: number;
  goals2026: number;
  active: boolean;
}
export interface ScoringRecord {
  leader: CareerScorer;
  previousRecord: { player: string; goals: number };
  broken: boolean;
  breaker: CareerScorer | null;
  board: CareerScorer[];
}

/** Live all-time World Cup scoring record, including the in-progress tournament. Augments
 * the committed historical top-scorer list (through 2022) with each player's 2026 goals
 * (matched by nation + last name). Returns null if the history list is empty. */
export function allTimeScoringRecord(snapshot: TournamentSnapshot): ScoringRecord | null {
  const hist = topScorers();
  if (!hist || !("allTime" in hist) || hist.allTime.length === 0) return null;

  // Index the current tournament's goals by (nation, last-name) so we can attach them to
  // the known historical leaders.
  const current = currentTopScorers(snapshot);
  const currentByKey = new Map<string, number>();
  for (const s of current) {
    const nation = resolveNation(s.nation) ?? s.nation;
    const key = `${nation}|${lastToken(s.name)}`;
    currentByKey.set(key, (currentByKey.get(key) ?? 0) + s.goals);
  }

  const board: CareerScorer[] = hist.allTime.map((h) => {
    const nation = resolveNation(h.team) ?? h.team;
    const goals2026 = currentByKey.get(`${nation}|${lastToken(h.player)}`) ?? 0;
    return {
      player: h.player,
      nation: h.team,
      historicalGoals: h.goals,
      goals2026,
      careerGoals: h.goals + goals2026,
      active: goals2026 > 0,
    };
  });
  board.sort((a, b) => b.careerGoals - a.careerGoals || b.goals2026 - a.goals2026 || a.player.localeCompare(b.player));

  // The previous record is the highest historical total (the through-2022 record holder).
  const previous = [...hist.allTime].sort((a, b) => b.goals - a.goals)[0]!;
  const leader = board[0]!;
  const broken = leader.careerGoals > previous.goals;
  return {
    leader,
    previousRecord: { player: previous.player, goals: previous.goals },
    broken,
    breaker: broken ? leader : null,
    board,
  };
}
