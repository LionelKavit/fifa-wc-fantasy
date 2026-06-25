// Monte Carlo simulation over the remaining group fixtures. Each trial samples a
// complete set of remaining results, recomputes all 12 group standings, and runs
// the best-8 third-place selection — capturing the cross-group coupling that makes
// third-place fate impossible to reason about group-by-group.

import type { TournamentSnapshot, Team } from "../data/models";
import type { StandingRow } from "./types";
import { buildOrderedRows, type MatchResult } from "./standings";
import { splitGroupFixtures } from "./scenarios";
import { rankThirdPlaced } from "./thirdPlace";
import { mulberry32, samplePoisson } from "./rng";
import { createPoissonModel, type OutcomeModel } from "./outcome";

export const DEFAULT_TRIALS = 50_000;
/** Expected additional goals per team for the rest of an in-progress match
 * (a fixed fallback for the unknown remaining time). */
export const DEFAULT_LIVE_REMAINING_LAMBDA = 0.7;

export interface SimulateOptions {
  trials?: number;
  seed?: number;
  model?: OutcomeModel;
  /** Expected remaining goals per team for live matches. */
  liveRemainingLambda?: number;
}

export interface BranchCounts {
  trials: number;
  advanced: number;
}

export interface SimulationResult {
  trials: number;
  /** teamId → number of trials in which the team advanced (top 2 or best-8 third). */
  advanceCount: Map<number, number>;
  /** Single-remaining teamId → advancement counts split by own result. */
  conditional: Map<number, { win: BranchCounts; draw: BranchCounts; loss: BranchCounts }>;
}

interface GroupSim {
  teams: Team[];
  completed: MatchResult[];
  remaining: { homeId: number; awayId: number; gidx: number }[];
}

interface RemSlot {
  homeId: number;
  awayId: number;
  live: boolean;
  liveHome: number;
  liveAway: number;
}

function emptyBranch(): BranchCounts {
  return { trials: 0, advanced: 0 };
}

export function simulate(snapshot: TournamentSnapshot, opts: SimulateOptions = {}): SimulationResult {
  const trials = opts.trials ?? DEFAULT_TRIALS;
  const seed = opts.seed ?? 1;
  const rng = mulberry32(seed);
  const model = opts.model ?? createPoissonModel();
  const liveLambda = opts.liveRemainingLambda ?? DEFAULT_LIVE_REMAINING_LAMBDA;

  // Build per-group inputs and a flat list of all remaining fixtures (the global
  // sample space shared across groups).
  const groups: GroupSim[] = [];
  const globalRemaining: RemSlot[] = [];
  for (const g of snapshot.groups) {
    const { completed, remaining } = splitGroupFixtures(snapshot, g.id);
    const rem = remaining.map((r) => {
      const gidx = globalRemaining.length;
      globalRemaining.push({
        homeId: r.homeId,
        awayId: r.awayId,
        live: r.live,
        liveHome: r.liveHomeScore,
        liveAway: r.liveAwayScore,
      });
      return { homeId: r.homeId, awayId: r.awayId, gidx };
    });
    groups.push({ teams: g.teams, completed, remaining: rem });
  }

  // Identify teams with exactly one remaining fixture (for conditional analysis).
  const remCount = new Map<number, number>();
  for (const m of globalRemaining) {
    remCount.set(m.homeId, (remCount.get(m.homeId) ?? 0) + 1);
    remCount.set(m.awayId, (remCount.get(m.awayId) ?? 0) + 1);
  }
  const singleRemaining = new Map<number, { gidx: number; isHome: boolean }>();
  globalRemaining.forEach((m, gidx) => {
    if (remCount.get(m.homeId) === 1) singleRemaining.set(m.homeId, { gidx, isHome: true });
    if (remCount.get(m.awayId) === 1) singleRemaining.set(m.awayId, { gidx, isHome: false });
  });

  // Accumulators.
  const advanceCount = new Map<number, number>();
  for (const g of snapshot.groups) for (const t of g.teams) advanceCount.set(t.id, 0);
  const conditional = new Map<number, { win: BranchCounts; draw: BranchCounts; loss: BranchCounts }>();
  for (const tid of singleRemaining.keys()) {
    conditional.set(tid, { win: emptyBranch(), draw: emptyBranch(), loss: emptyBranch() });
  }

  const sampled = new Array<[number, number]>(globalRemaining.length);
  const thirdRows: StandingRow[] = [];

  for (let t = 0; t < trials; t++) {
    for (let i = 0; i < globalRemaining.length; i++) {
      const slot = globalRemaining[i]!;
      if (slot.live) {
        // Seed the current scoreline and sample only the remaining goals.
        sampled[i] = [slot.liveHome + samplePoisson(liveLambda, rng), slot.liveAway + samplePoisson(liveLambda, rng)];
      } else {
        sampled[i] = model({ homeId: slot.homeId, awayId: slot.awayId }, rng);
      }
    }

    const advancing = new Set<number>();
    thirdRows.length = 0;
    for (const gs of groups) {
      const scenario = gs.completed.slice();
      for (const r of gs.remaining) {
        const s = sampled[r.gidx]!;
        scenario.push({ homeId: r.homeId, awayId: r.awayId, homeGoals: s[0], awayGoals: s[1] });
      }
      const rows = buildOrderedRows(gs.teams, scenario);
      advancing.add(rows[0]!.teamId);
      advancing.add(rows[1]!.teamId);
      if (rows[2]) thirdRows.push(rows[2]);
    }

    for (const id of rankThirdPlaced(thirdRows).qualified) advancing.add(id);

    for (const id of advancing) advanceCount.set(id, advanceCount.get(id)! + 1);

    for (const [tid, info] of singleRemaining) {
      const s = sampled[info.gidx]!;
      const forGoals = info.isHome ? s[0] : s[1];
      const againstGoals = info.isHome ? s[1] : s[0];
      const branchKey = forGoals > againstGoals ? "win" : forGoals < againstGoals ? "loss" : "draw";
      const branch = conditional.get(tid)![branchKey];
      branch.trials++;
      if (advancing.has(tid)) branch.advanced++;
    }
  }

  return { trials, advanceCount, conditional };
}
