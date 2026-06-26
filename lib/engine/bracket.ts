// FIFA World Cup 2026 knockout bracket — pure Layer-1 structure.
//
// Builds the single-elimination tree (Round of 32 → Final) from a
// TournamentSnapshot. This module is STRUCTURE ONLY: it computes no
// probabilities. It reads group order from `standings` and resolves concrete
// teams from the snapshot itself, leaving human-readable placeholders for any
// slot not yet decided.
//
// Sources for the static layout (official FIFA 2026 match schedule):
//  - Round of 32 pairings (matches 73–88) and the third-placed candidate groups
//    per slot are from FIFA's published bracket / regulations Annex C.
//  - Round of 16 → Final chaining (matches 89–104, excluding the 3rd-place
//    playoff, match 103) is from the same schedule.
//
// NOTE ON THIRD-PLACED ASSIGNMENT: which of the 8 best third-placed teams lands
// in which slot is defined by FIFA's Annex C. We resolve third-placed slots first
// *grounded in the snapshot's own R32 fixtures* (the authoritative assignment,
// once the bracket locks). When the groups are all final but the snapshot has no
// R32 assignment yet (or for simulated snapshots), we fall back to the
// self-computed Annex C allocation (see `thirdPlaceAllocation.ts`). Slots stay as
// candidate-set placeholders until one of those resolves them.

import type { TournamentSnapshot, GroupId, Fixture, Stage } from "../data/models";
import type {
  Bracket,
  BracketMatch,
  BracketSlot,
  BracketTeamRef,
  Feeder,
  GroupPosition,
  KnockoutStage,
  StandingRow,
} from "./types";
import { computeGroupStandings } from "./standings";
import { rankThirdPlaced } from "./thirdPlace";
import { allocateThirds } from "./thirdPlaceAllocation";
import { R32_LAYOUT, KO_LAYOUT, type R32Feeder } from "./bracketLayout";

const matchId = (n: number): string => `M${n}`;

/** Per-team probability of finishing 1st/2nd/3rd in its group (from `advancement-probability`). */
export type FinishProbs = Map<number, { first: number; second: number; third: number }>;

/** A model-projected Round-of-32 field, used to fill the bracket before the real teams are known. */
export interface R32Projection {
  /** group id → projected winner team id. */
  winner: Map<GroupId, number>;
  /** group id → projected runner-up team id. */
  runnerUp: Map<GroupId, number>;
  /** Round-of-32 match number → projected third-placed team id. */
  thirdByMatch: Map<number, number>;
}

/**
 * Project the most-likely Round-of-32 field from finishing-position probabilities:
 * a coherent winner/runner-up/third per group (greedy by position), then the best
 * eight projected thirds allocated to slots via the Annex C allocation.
 */
export function projectR32(snapshot: TournamentSnapshot, finish: FinishProbs): R32Projection {
  const zero = { first: 0, second: 0, third: 0 };
  const f = (id: number) => finish.get(id) ?? zero;
  const winner = new Map<GroupId, number>();
  const runnerUp = new Map<GroupId, number>();
  const thirdByGroup = new Map<GroupId, number>();
  const top3 = new Map<number, number>(); // teamId → P(top 3), a strength proxy

  for (const g of snapshot.groups) {
    const ids = g.teams.map((t) => t.id);
    const used = new Set<number>();
    const pickMax = (key: "first" | "second" | "third"): number => {
      let best = ids[0]!;
      let bv = -1;
      for (const id of ids) {
        if (used.has(id)) continue;
        const v = f(id)[key];
        if (v > bv) {
          bv = v;
          best = id;
        }
      }
      used.add(best);
      return best;
    };
    winner.set(g.id, pickMax("first"));
    runnerUp.set(g.id, pickMax("second"));
    const third = pickMax("third");
    thirdByGroup.set(g.id, third);
    top3.set(third, f(third).first + f(third).second + f(third).third);
  }

  // Best eight projected thirds (by strength proxy) → allocate via Annex C.
  const best8Groups = [...thirdByGroup.keys()]
    .sort((a, b) => (top3.get(thirdByGroup.get(b)!) ?? 0) - (top3.get(thirdByGroup.get(a)!) ?? 0))
    .slice(0, 8);
  const thirdByMatch = new Map<number, number>();
  if (best8Groups.length > 0) {
    for (const [match, grp] of allocateThirds(best8Groups)) {
      const teamId = thirdByGroup.get(grp);
      if (teamId !== undefined) thirdByMatch.set(match, teamId);
    }
  }

  return { winner, runnerUp, thirdByMatch };
}

function positionPlaceholder(group: GroupId, position: GroupPosition): string {
  const where = `Group ${group.toUpperCase()}`;
  return position === "winner" ? `Winner ${where}` : `Runner-up ${where}`;
}

function thirdPlacePlaceholder(candidateGroups: GroupId[]): string {
  return `3rd ${candidateGroups.map((c) => c.toUpperCase()).join("/")}`;
}

/**
 * Build the WC 2026 knockout bracket from a snapshot. Pure: identical snapshots
 * yield identical brackets.
 */
export function buildBracket(snapshot: TournamentSnapshot, opts: { projection?: R32Projection } = {}): Bracket {
  const projection = opts.projection;
  const teamById = new Map(snapshot.teams.map((t) => [t.id, t]));
  const ref = (teamId: number): BracketTeamRef | null => {
    const t = teamById.get(teamId);
    return t ? { teamId: t.id, abbr: t.abbr, name: t.name } : null;
  };

  // --- Group positions, only for groups whose standings are final. ---
  const finalGroups = new Map<GroupId, { winner: BracketTeamRef | null; runnerUp: BracketTeamRef | null }>();
  const thirdByGroup = new Map<GroupId, BracketTeamRef | null>();
  const thirdRows: StandingRow[] = [];
  for (const group of snapshot.groups) {
    const table = computeGroupStandings(snapshot, group.id);
    const allPlayed = table.rows.length > 0 && table.rows.every((r) => r.played === 3);
    if (!allPlayed) continue;
    finalGroups.set(group.id, {
      winner: table.rows[0] ? ref(table.rows[0].teamId) : null,
      runnerUp: table.rows[1] ? ref(table.rows[1].teamId) : null,
    });
    if (table.rows[2]) {
      thirdByGroup.set(group.id, ref(table.rows[2].teamId));
      thirdRows.push(table.rows[2]);
    }
  }
  const groupTeam = (group: GroupId, position: GroupPosition): BracketTeamRef | null => {
    const f = finalGroups.get(group);
    if (!f) return null;
    return position === "winner" ? f.winner : f.runnerUp;
  };

  // --- Self-computed Annex C allocation, when every group is final. ---
  // Maps a third-placed Round-of-32 slot (match number) → the team assigned to it.
  // Used only as a fallback; grounded snapshot resolution takes precedence.
  const allocatedThird = new Map<number, BracketTeamRef | null>();
  const allGroupsFinal = snapshot.groups.length > 0 && finalGroups.size === snapshot.groups.length;
  if (allGroupsFinal) {
    const teamGroup = new Map(snapshot.teams.map((t) => [t.id, t.group]));
    const qualified = rankThirdPlaced(thirdRows).qualified;
    const qualifiedGroups = qualified.map((id) => teamGroup.get(id)!).filter((g): g is GroupId => g !== undefined);
    if (qualifiedGroups.length > 0) {
      for (const [match, group] of allocateThirds(qualifiedGroups)) {
        allocatedThird.set(match, thirdByGroup.get(group) ?? null);
      }
    }
  }

  // --- Snapshot fixture lookups (grounded resolution). ---
  const koFixtureWithTeam = (stage: Stage, teamId: number): Fixture | null =>
    snapshot.fixtures.find(
      (f) => f.stage === stage && (f.homeTeamId === teamId || f.awayTeamId === teamId),
    ) ?? null;
  const koFixtureBetween = (stage: Stage, aId: number, bId: number): Fixture | null =>
    snapshot.fixtures.find(
      (f) =>
        f.stage === stage &&
        ((f.homeTeamId === aId && f.awayTeamId === bId) || (f.homeTeamId === bId && f.awayTeamId === aId)),
    ) ?? null;
  const winnerOf = (f: Fixture | null): number | null => {
    if (!f || f.homeScore === null || f.awayScore === null) return null;
    if (f.homeScore > f.awayScore) return f.homeTeamId;
    if (f.awayScore > f.homeScore) return f.awayTeamId;
    return null; // level after the recorded score (e.g. decided on penalties) — not encoded
  };

  const byNumber = new Map<number, BracketMatch>();

  // --- Round of 32. ---
  for (const layout of R32_LAYOUT) {
    const home = buildR32Slot(layout.home);
    const away = buildR32Slot(layout.away);
    // Ground a third-placed slot from the snapshot's own R32 fixture: every
    // third-placed slot is paired with a group winner, so once that winner is
    // known we can read its assigned opponent directly from the fixtures.
    groundThird(home, away);
    groundThird(away, home);
    // Fallback: self-computed Annex C allocation when grounding found nothing.
    allocateThird(home, layout.match);
    allocateThird(away, layout.match);
    // Last resort: model projection (flagged) before the real third is known.
    projectThird(home, layout.match);
    projectThird(away, layout.match);

    let winner: BracketTeamRef | null = null;
    if (home.team && away.team) {
      winner = ref(winnerOf(koFixtureBetween("R32", home.team.teamId, away.team.teamId)) ?? -1);
    }
    byNumber.set(layout.match, {
      id: matchId(layout.match),
      matchNumber: layout.match,
      stage: "R32",
      slots: [home, away],
      winner,
    });
  }

  // --- R16 → Final (KO_LAYOUT is ordered so predecessors are always built first). ---
  for (const layout of KO_LAYOUT) {
    const home = winnerSlot(byNumber.get(layout.home)!);
    const away = winnerSlot(byNumber.get(layout.away)!);
    let winner: BracketTeamRef | null = null;
    if (home.team && away.team) {
      winner = ref(winnerOf(koFixtureBetween(layout.stage as Stage, home.team.teamId, away.team.teamId)) ?? -1);
    }
    byNumber.set(layout.match, {
      id: matchId(layout.match),
      matchNumber: layout.match,
      stage: layout.stage,
      slots: [home, away],
      winner,
    });
  }

  const matches = [...byNumber.values()].sort((a, b) => a.matchNumber - b.matchNumber);
  const byStage: Record<KnockoutStage, BracketMatch[]> = { R32: [], R16: [], QF: [], SF: [], F: [] };
  for (const m of matches) byStage[m.stage].push(m);
  return { matches, byStage };

  // ---- helpers closing over snapshot-derived data ----

  function buildR32Slot(spec: R32Feeder): BracketSlot {
    if (spec.kind === "group") {
      const feeder: Feeder = { kind: "group", group: spec.group, position: spec.position };
      const team = groupTeam(spec.group, spec.position);
      if (team) return { feeder, team, label: team.name };
      // Fallback: model projection (flagged) before the real result is known.
      const projId = projection
        ? (spec.position === "winner" ? projection.winner : projection.runnerUp).get(spec.group)
        : undefined;
      const proj = projId !== undefined ? ref(projId) : null;
      if (proj) return { feeder, team: proj, label: proj.name, projected: true };
      return { feeder, team: null, label: positionPlaceholder(spec.group, spec.position) };
    }
    const feeder: Feeder = { kind: "thirdPlace", candidateGroups: spec.candidateGroups };
    return { feeder, team: null, label: thirdPlacePlaceholder(spec.candidateGroups) };
  }

  function allocateThird(slot: BracketSlot, match: number): void {
    if (slot.feeder.kind !== "thirdPlace" || slot.team) return;
    const team = allocatedThird.get(match);
    if (team) {
      slot.team = team;
      slot.label = team.name;
    }
  }

  function projectThird(slot: BracketSlot, match: number): void {
    if (slot.feeder.kind !== "thirdPlace" || slot.team || !projection) return;
    const teamId = projection.thirdByMatch.get(match);
    if (teamId === undefined) return;
    const team = ref(teamId);
    if (team) {
      slot.team = team;
      slot.label = team.name;
      slot.projected = true;
    }
  }

  function groundThird(slot: BracketSlot, partner: BracketSlot): void {
    if (slot.feeder.kind !== "thirdPlace" || slot.team || !partner.team) return;
    const f = koFixtureWithTeam("R32", partner.team.teamId);
    if (!f) return;
    const oppId = f.homeTeamId === partner.team.teamId ? f.awayTeamId : f.homeTeamId;
    const opp = ref(oppId);
    if (opp) {
      slot.team = opp;
      slot.label = opp.name;
    }
  }

  function winnerSlot(prev: BracketMatch): BracketSlot {
    const feeder: Feeder = { kind: "matchWinner", matchId: prev.id };
    const team = prev.winner;
    return { feeder, team, label: team ? team.name : winnerPlaceholder(prev) };
  }
}

/** Placeholder for an undecided match-winner feeder, described by its participants. */
function winnerPlaceholder(prev: BracketMatch): string {
  const [a, b] = prev.slots;
  const aName = a.team ? a.team.abbr : a.label;
  const bName = b.team ? b.team.abbr : b.label;
  return `Winner of ${prev.id} (${aName} v ${bName})`;
}
