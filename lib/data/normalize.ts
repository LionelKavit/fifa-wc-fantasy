// Pure normalization: join raw payloads into typed domain models, validating
// referential integrity (every player maps to a team; every group has 4 teams).

import type {
  TournamentSnapshot,
  Team,
  Group,
  Player,
  Round,
  Fixture,
  GoalEvent,
  FixtureStatus,
} from "./models";
import type { RawPlayer, RawSquad, RawRound } from "./schema";

/** Thrown when raw payloads cannot be joined into a consistent snapshot. */
export class NormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NormalizationError";
  }
}

function mapFixtureStatus(raw: string): FixtureStatus {
  if (raw === "complete") return "complete";
  if (raw === "scheduled") return "scheduled";
  return "live";
}

export interface RawPayloads {
  players: RawPlayer[];
  squads: RawSquad[];
  rounds: RawRound[];
}

export function normalize(
  raw: RawPayloads,
  fetchedAt: string,
): TournamentSnapshot {
  // Teams + lookup.
  const teams: Team[] = raw.squads.map((s) => ({
    id: s.id,
    name: s.name,
    abbr: s.abbr,
    group: s.group,
    isEliminated: s.isEliminated,
  }));
  const teamById = new Map<number, Team>(teams.map((t) => [t.id, t]));

  // Groups (sorted a–l), each must have exactly 4 teams.
  const byGroup = new Map<string, Team[]>();
  for (const t of teams) {
    const bucket = byGroup.get(t.group);
    if (bucket) bucket.push(t);
    else byGroup.set(t.group, [t]);
  }
  const groups: Group[] = [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, ts]) => ({ id, teams: ts }));
  for (const g of groups) {
    if (g.teams.length !== 4) {
      throw new NormalizationError(
        `Group "${g.id}" has ${g.teams.length} teams, expected 4`,
      );
    }
  }

  // Players joined to teams via squadId (1–48).
  const players: Player[] = raw.players.map((p) => {
    if (!teamById.has(p.squadId)) {
      throw new NormalizationError(
        `Player ${p.id} has squadId ${p.squadId} with no matching team`,
      );
    }
    const name =
      p.knownName ?? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
    return {
      id: p.id,
      name,
      firstName: p.firstName,
      lastName: p.lastName,
      knownName: p.knownName,
      teamId: p.squadId,
      position: p.position,
      price: p.price,
      status: p.status,
      ownership: p.percentSelected,
      form: p.stats.form,
      totalPoints: p.stats.totalPoints,
    };
  });

  // Rounds + flattened fixtures.
  const rounds: Round[] = raw.rounds.map((r) => ({
    id: r.id,
    stage: r.stage,
    status: r.status,
    startDate: r.startDate,
    endDate: r.endDate,
  }));

  const toGoals = (raw: { playerId: number; assistId: number | null; isOwnGoal: boolean }[] | null | undefined): GoalEvent[] =>
    (raw ?? []).map((g) => ({ playerId: g.playerId, assistId: g.assistId, isOwnGoal: g.isOwnGoal }));

  const fixtures: Fixture[] = [];
  for (const r of raw.rounds) {
    for (const t of r.tournaments) {
      fixtures.push({
        id: t.id,
        roundId: r.id,
        stage: r.stage,
        status: mapFixtureStatus(t.status),
        kickoff: t.date,
        homeTeamId: t.homeSquadId,
        awayTeamId: t.awaySquadId,
        homeScore: t.homeScore ?? null,
        awayScore: t.awayScore ?? null,
        venue: t.venueName ?? null,
        goals: [...toGoals(t.homeGoalScorersAssists), ...toGoals(t.awayGoalScorersAssists)],
      });
    }
  }

  return { fetchedAt, teams, groups, players, rounds, fixtures };
}
