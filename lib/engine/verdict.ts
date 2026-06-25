// Top-2 qualification verdicts by exact enumeration of remaining group outcomes.
//
// For each group we fix the completed results and enumerate every combination of
// remaining-fixture scorelines (over the saturating margin range). For each team
// we record the set of finishing ranks reachable across all combinations, plus —
// for a team with exactly one remaining fixture — the rank range reachable under
// each of its own win/draw/loss outcomes. Classification follows directly:
//   clinched  ⇔ every reachable rank ≤ 2
//   alive     ⇔ rank ≤ 2 reachable, but not always
//   eliminated⇔ rank ≤ 2 never reachable (top-2 only)
// Advancement additionally accounts for the third-place route so a team that can
// still finish 3rd is never reported as outright eliminated.

import type { TournamentSnapshot, GroupId, Team } from "../data/models";
import type {
  GroupQualification,
  TeamQualification,
  OutcomeEffect,
  TopTwoVerdict,
  AdvancementStatus,
} from "./types";
import { buildOrderedRows, type MatchResult } from "./standings";
import { splitGroupFixtures, candidateScorelines, type RemainingMatch } from "./scenarios";

interface RankRange {
  min: number;
  max: number;
}

function widen(r: RankRange, rank: number): void {
  if (rank < r.min) r.min = rank;
  if (rank > r.max) r.max = rank;
}

/** Effect on top-2 qualification from a rank range reachable under one own result. */
function classifyOutcome(range: RankRange): OutcomeEffect {
  if (range.max <= 2) return "clinch"; // always top 2 with this result
  if (range.min > 2) return "eliminated"; // never top 2 with this result
  return "depends";
}

export function computeQualificationVerdicts(
  snapshot: TournamentSnapshot,
  groupId: GroupId,
): GroupQualification {
  const group = snapshot.groups.find((g) => g.id === groupId);
  if (!group) throw new Error(`Unknown group "${groupId}"`);
  const teams: Team[] = group.teams;
  const { completed, remaining } = splitGroupFixtures(snapshot, groupId);
  const candidates = candidateScorelines(completed, remaining, teams);

  // Index a team's single remaining fixture (if exactly one) for own-result analysis.
  const remainingByTeam = new Map<number, number[]>(); // teamId -> indices into `remaining`
  for (const t of teams) remainingByTeam.set(t.id, []);
  remaining.forEach((rm, idx) => {
    remainingByTeam.get(rm.homeId)?.push(idx);
    remainingByTeam.get(rm.awayId)?.push(idx);
  });

  // Accumulators.
  const reachable = new Map<number, Set<number>>(); // teamId -> reachable ranks
  const ownRanges = new Map<number, { win: RankRange; draw: RankRange; loss: RankRange }>();
  for (const t of teams) {
    reachable.set(t.id, new Set());
    if (remainingByTeam.get(t.id)!.length === 1) {
      ownRanges.set(t.id, {
        win: { min: 99, max: 0 },
        draw: { min: 99, max: 0 },
        loss: { min: 99, max: 0 },
      });
    }
  }

  // Enumerate all scoreline combinations across the remaining fixtures.
  const total = Math.pow(candidates.length, remaining.length);
  const remScores = new Array<[number, number]>(remaining.length);
  for (let c = 0; c < total; c++) {
    let n = c;
    const scenario: MatchResult[] = completed.slice();
    for (let m = 0; m < remaining.length; m++) {
      const ci = n % candidates.length;
      n = Math.floor(n / candidates.length);
      const pair = candidates[ci]!;
      remScores[m] = pair;
      const rm = remaining[m]!;
      scenario.push({ homeId: rm.homeId, awayId: rm.awayId, homeGoals: pair[0], awayGoals: pair[1] });
    }

    const rows = buildOrderedRows(teams, scenario);
    for (const row of rows) {
      reachable.get(row.teamId)!.add(row.rank);
      const own = ownRanges.get(row.teamId);
      if (own) {
        const idx = remainingByTeam.get(row.teamId)![0]!;
        const rm = remaining[idx]!;
        const [hg, ag] = remScores[idx]!;
        const isHome = rm.homeId === row.teamId;
        const forGoals = isHome ? hg : ag;
        const againstGoals = isHome ? ag : hg;
        const bucket = forGoals > againstGoals ? own.win : forGoals < againstGoals ? own.loss : own.draw;
        widen(bucket, row.rank);
      }
    }
  }

  const teamResults: TeamQualification[] = teams.map((t) => {
    const ranks = reachable.get(t.id)!;
    const bestPossibleRank = Math.min(...ranks);
    const worstPossibleRank = Math.max(...ranks);
    const canTopTwo = ranks.has(1) || ranks.has(2);
    const mustTopTwo = [...ranks].every((r) => r <= 2);
    const canThird = ranks.has(3);

    const topTwo: TopTwoVerdict = mustTopTwo ? "clinched" : canTopTwo ? "alive" : "eliminated";
    const advancement: AdvancementStatus = mustTopTwo
      ? "clinched"
      : canTopTwo
        ? "contention"
        : canThird
          ? "thirdPlaceRace"
          : "eliminated";
    const thirdPlaceEligible = canThird && !mustTopTwo;

    const own = ownRanges.get(t.id);
    let ownMatch: TeamQualification["ownMatch"] = null;
    if (own) {
      const idx = remainingByTeam.get(t.id)![0]!;
      const rm = remaining[idx]!;
      const opponentId = rm.homeId === t.id ? rm.awayId : rm.homeId;
      const opponent = teams.find((x) => x.id === opponentId)!;
      ownMatch = {
        fixtureId: rm.fixtureId,
        opponentId,
        opponentAbbr: opponent.abbr,
        win: classifyOutcome(own.win),
        draw: classifyOutcome(own.draw),
        loss: classifyOutcome(own.loss),
      };
    }

    return {
      teamId: t.id,
      abbr: t.abbr,
      name: t.name,
      topTwo,
      thirdPlaceEligible,
      advancement,
      bestPossibleRank,
      worstPossibleRank,
      ownMatch,
    };
  });

  return { groupId, teams: teamResults };
}
