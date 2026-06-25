// Assemble engine outputs into structured per-team / per-group "situations".
// Pure: joins the deterministic verdict (Layer 1) and, when supplied, the
// probabilistic advancement report (Layer 2). It never recomputes either — there
// is one source of truth — and it never calls an LLM.

import type { TournamentSnapshot } from "../data/models";
import {
  computeGroupStandings,
  computeQualificationVerdicts,
  liveFixturesForGroup,
  type StandingRow,
  type TopTwoVerdict,
  type AdvancementStatus,
  type OwnMatchConditions,
  type TeamQualification,
} from "../engine";
import type { AdvancementReport, ConditionalProbability } from "../engine";
import { narrateTeam, narrateGroup } from "./narrate";

export interface SituationOptions {
  /** Fold in-progress scores into the standings ("as it stands"). */
  provisional?: boolean;
}

export interface GroupLiveFixture {
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number;
  awayScore: number;
}

/** Structured facts about one team's qualification situation, without narration. */
export interface TeamFacts {
  teamId: number;
  abbr: string;
  name: string;
  groupId: string;
  rank: number;
  points: number;
  goalDifference: number;
  played: number;
  topTwo: TopTwoVerdict;
  advancement: AdvancementStatus;
  thirdPlaceEligible: boolean;
  /** Per-own-result effect on top-2 qualification; null when not a single-remaining team. */
  ownMatch: OwnMatchConditions | null;
  /** Round-of-32 advancement probability; null when no advancement report supplied. */
  advancementProbability: number | null;
  /** Advancement probability split by the team's own next result; null when unavailable. */
  conditionalProbability: ConditionalProbability | null;
}

export interface TeamSituation extends TeamFacts {
  narration: string;
}

export interface GroupFacts {
  groupId: string;
  table: StandingRow[];
  teams: TeamSituation[];
  /** Teams whose fate is mathematically settled. */
  decidedPlaces: { qualified: number[]; eliminated: number[] };
  /** True when an in-progress score is folded into the standings. */
  provisional: boolean;
  /** In-progress fixtures in this group with current scores. */
  liveFixtures: GroupLiveFixture[];
}

export interface GroupSituation extends GroupFacts {
  narration: string;
}

interface ReportEntry {
  probability: number;
  conditional: ConditionalProbability | null;
}

function indexReport(report?: AdvancementReport): Map<number, ReportEntry> {
  const m = new Map<number, ReportEntry>();
  if (report) {
    for (const t of report.teams) {
      m.set(t.teamId, { probability: t.probability, conditional: t.conditional });
    }
  }
  return m;
}

function assembleTeamFacts(
  row: StandingRow,
  verdict: TeamQualification,
  groupId: string,
  prob: ReportEntry | null,
): TeamFacts {
  return {
    teamId: verdict.teamId,
    abbr: verdict.abbr,
    name: verdict.name,
    groupId,
    rank: row.rank,
    points: row.points,
    goalDifference: row.goalDifference,
    played: row.played,
    topTwo: verdict.topTwo,
    advancement: verdict.advancement,
    thirdPlaceEligible: verdict.thirdPlaceEligible,
    ownMatch: verdict.ownMatch,
    advancementProbability: prob ? prob.probability : null,
    conditionalProbability: prob ? prob.conditional : null,
  };
}

/** Build a team's situation. Pass an `AdvancementReport` to include probabilities;
 * omit it for a cheaper verdict-only situation. */
export function buildTeamSituation(
  snapshot: TournamentSnapshot,
  teamId: number,
  report?: AdvancementReport,
  opts: SituationOptions = {},
): TeamSituation {
  const group = snapshot.groups.find((g) => g.teams.some((t) => t.id === teamId));
  if (!group) throw new Error(`Unknown team id ${teamId}`);
  const row = computeGroupStandings(snapshot, group.id, { provisional: opts.provisional }).rows.find(
    (r) => r.teamId === teamId,
  )!;
  const verdict = computeQualificationVerdicts(snapshot, group.id).teams.find((v) => v.teamId === teamId)!;
  const prob = indexReport(report).get(teamId) ?? null;
  const facts = assembleTeamFacts(row, verdict, group.id, prob);
  return { ...facts, narration: narrateTeam(facts) };
}

/** Build a whole group's situation (ordered table + every team + decided places).
 * With `provisional`, in-progress scores are folded into the standings. */
export function buildGroupSituation(
  snapshot: TournamentSnapshot,
  groupId: string,
  report?: AdvancementReport,
  opts: SituationOptions = {},
): GroupSituation {
  const standings = computeGroupStandings(snapshot, groupId, { provisional: opts.provisional });
  const verdicts = computeQualificationVerdicts(snapshot, groupId).teams;
  const verdictById = new Map(verdicts.map((v) => [v.teamId, v]));
  const reportById = indexReport(report);

  const teams: TeamSituation[] = standings.rows.map((row) => {
    const facts = assembleTeamFacts(row, verdictById.get(row.teamId)!, groupId, reportById.get(row.teamId) ?? null);
    return { ...facts, narration: narrateTeam(facts) };
  });

  const decidedPlaces = {
    qualified: teams.filter((t) => t.advancement === "clinched").map((t) => t.teamId),
    eliminated: teams.filter((t) => t.advancement === "eliminated").map((t) => t.teamId),
  };

  const liveFixtures: GroupLiveFixture[] = liveFixturesForGroup(snapshot, groupId).map((f) => ({
    homeAbbr: f.homeAbbr,
    awayAbbr: f.awayAbbr,
    homeScore: f.homeScore,
    awayScore: f.awayScore,
  }));

  const facts: GroupFacts = {
    groupId,
    table: standings.rows,
    teams,
    decidedPlaces,
    provisional: standings.provisional,
    liveFixtures,
  };
  const base = narrateGroup(facts);
  const narration = standings.provisional && liveFixtures.length ? `As it stands — ${base}` : base;
  return { ...facts, narration };
}
