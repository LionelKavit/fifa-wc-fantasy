// Monte Carlo simulation over the remaining group fixtures. Each trial samples a
// complete set of remaining results, recomputes all 12 group standings, and runs
// the best-8 third-place selection — capturing the cross-group coupling that makes
// third-place fate impossible to reason about group-by-group.

import type { TournamentSnapshot, Team, GroupId, Stage } from "../data/models";
import type { StandingRow, Prediction, KnockoutStage } from "./types";
import { buildOrderedRows, type MatchResult } from "./standings";
import { splitGroupFixtures } from "./scenarios";
import { rankThirdPlaced } from "./thirdPlace";
import { mulberry32, samplePoisson } from "./rng";
import { createPoissonModel, type OutcomeModel } from "./outcome";
import { R32_LAYOUT, KO_LAYOUT, REACH_BY_WINNING, STAGE_MATCH_NUMBERS, ORDERED_STAGES, type R32Feeder } from "./bracketLayout";
import { allocateThirds } from "./thirdPlaceAllocation";

export const DEFAULT_TRIALS = 50_000;
/** Expected additional goals per team for the rest of an in-progress match
 * (a fixed fallback for the unknown remaining time). */
export const DEFAULT_LIVE_REMAINING_LAMBDA = 0.7;
/** Expected goals per team in extra time (~30 of 90 minutes) when a knockout
 * match is level after regulation. If still level, a penalty shootout is treated
 * as a 50/50 — penalties are empirically near-random, so biasing the favourite
 * would be less authentic, not more. */
export const DEFAULT_KO_EXTRA_TIME_LAMBDA = 0.45;

export interface SimulateOptions {
  trials?: number;
  seed?: number;
  model?: OutcomeModel;
  /** Expected remaining goals per team for live matches. */
  liveRemainingLambda?: number;
  /** Play each trial out through the knockout bracket (R32→Final) to collect
   * per-stage reach counts and matchup outcomes. Off by default so the advancement
   * path stays fast. */
  playoutKnockout?: boolean;
  /** Expected goals per team in extra time for level knockout matches. */
  koExtraTimeLambda?: number;
  /** When provided (and `playoutKnockout` is set), each trial also records whether
   * this prediction's picks survive through each round, conditioned on any
   * already-decided real results (which the play-out keeps fixed). */
  prediction?: Prediction;
  /** Ignore already-completed knockout results during play-out, i.e. re-simulate
   * every knockout match. Used to obtain the pre-knockout (lock-time) odds rather
   * than the "as it stands" view. */
  ignoreCompletedKnockouts?: boolean;
}

export interface BranchCounts {
  trials: number;
  advanced: number;
}

/** Trials in which a team finished 1st / 2nd / 3rd in its group. */
export interface PositionCount {
  first: number;
  second: number;
  third: number;
}

/** Trials in which a team reached each knockout stage (won the prior round). */
export interface StageReach {
  r16: number;
  qf: number;
  sf: number;
  final: number;
  champion: number;
}

/** Outcomes of a realized knockout pairing across trials. `lowWins` counts wins
 * by the lower-id side; the higher-id side's wins are `meetings - lowWins`. */
export interface MatchupCount {
  lowId: number;
  highId: number;
  meetings: number;
  lowWins: number;
}

export interface SimulationResult {
  trials: number;
  /** teamId → number of trials in which the team advanced (top 2 or best-8 third). */
  advanceCount: Map<number, number>;
  /** Single-remaining teamId → advancement counts split by own result. */
  conditional: Map<number, { win: BranchCounts; draw: BranchCounts; loss: BranchCounts }>;
  /** teamId → counts of finishing 1st/2nd/3rd in its group (always populated). */
  positionCount: Map<number, PositionCount>;
  /** teamId → per-stage reach counts. Populated only when `playoutKnockout` is set. */
  stageReach: Map<number, StageReach>;
  /** "lowId-highId" → matchup outcome counts. Populated only when `playoutKnockout` is set. */
  matchups: Map<string, MatchupCount>;
  /** Per-round count of trials in which the supplied `prediction`'s picks all held
   * through that round. Populated only when a `prediction` is given. */
  survivalByStage: Record<KnockoutStage, number>;
}

interface GroupSim {
  id: GroupId;
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

function emptyStageReach(): StageReach {
  return { r16: 0, qf: 0, sf: 0, final: 0, champion: 0 };
}

const pairKey = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`);

export function simulate(snapshot: TournamentSnapshot, opts: SimulateOptions = {}): SimulationResult {
  const trials = opts.trials ?? DEFAULT_TRIALS;
  const seed = opts.seed ?? 1;
  const rng = mulberry32(seed);
  const model = opts.model ?? createPoissonModel();
  const liveLambda = opts.liveRemainingLambda ?? DEFAULT_LIVE_REMAINING_LAMBDA;
  const playoutKnockout = opts.playoutKnockout ?? false;
  const etLambda = opts.koExtraTimeLambda ?? DEFAULT_KO_EXTRA_TIME_LAMBDA;
  // Pre-resolve the prediction's pick per match number, for the survival pass.
  const predByMatch = new Map<number, number>();
  if (opts.prediction) {
    for (const [matchId, teamId] of opts.prediction) predByMatch.set(Number(matchId.slice(1)), teamId);
  }
  const trackSurvival = playoutKnockout && predByMatch.size > 0;

  // Real, already-decided knockout results (kept fixed across trials), keyed by
  // "stage:lowId-highId" → winning team id. Only decisive scores are recorded.
  const koResults = new Map<string, number>();
  if (playoutKnockout && !opts.ignoreCompletedKnockouts) {
    for (const f of snapshot.fixtures) {
      if (f.stage === "GROUP" || f.status !== "complete" || f.homeScore === null || f.awayScore === null) continue;
      if (f.homeScore === f.awayScore) continue; // level after recorded score — winner unknown
      const winner = f.homeScore > f.awayScore ? f.homeTeamId : f.awayTeamId;
      koResults.set(`${f.stage}:${pairKey(f.homeTeamId, f.awayTeamId)}`, winner);
    }
  }
  const teamGroup = new Map<number, GroupId>(snapshot.teams.map((t) => [t.id, t.group]));

  /** Resolve a level-after-90 knockout match: extra time, then a 50/50 shootout. */
  const playKnockout = (a: number, b: number, stage: Stage): number => {
    const real = koResults.get(`${stage}:${pairKey(a, b)}`);
    if (real !== undefined) return real;
    const [ha, hb] = model({ homeId: a, awayId: b }, rng);
    if (ha !== hb) return ha > hb ? a : b;
    const ea = samplePoisson(etLambda, rng);
    const eb = samplePoisson(etLambda, rng);
    if (ea !== eb) return ea > eb ? a : b;
    return rng() < 0.5 ? a : b; // penalties
  };

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
    groups.push({ id: g.id, teams: g.teams, completed, remaining: rem });
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
  const positionCount = new Map<number, PositionCount>();
  for (const g of snapshot.groups)
    for (const t of g.teams) {
      advanceCount.set(t.id, 0);
      positionCount.set(t.id, { first: 0, second: 0, third: 0 });
    }
  const conditional = new Map<number, { win: BranchCounts; draw: BranchCounts; loss: BranchCounts }>();
  for (const tid of singleRemaining.keys()) {
    conditional.set(tid, { win: emptyBranch(), draw: emptyBranch(), loss: emptyBranch() });
  }

  const stageReach = new Map<number, StageReach>();
  const matchups = new Map<string, MatchupCount>();
  const survivalByStage: Record<KnockoutStage, number> = { R32: 0, R16: 0, QF: 0, SF: 0, F: 0 };
  if (playoutKnockout) {
    for (const g of snapshot.groups) for (const t of g.teams) stageReach.set(t.id, emptyStageReach());
  }

  // Reusable per-trial buffers for the knockout play-out (avoid per-trial allocation).
  const groupIndex = new Map<GroupId, number>(groups.map((gs, i) => [gs.id, i]));
  const grpWinner = new Array<number>(groups.length).fill(0);
  const grpRunner = new Array<number>(groups.length).fill(0);
  const grpThird = new Array<number>(groups.length).fill(0);
  const koWinner = new Map<number, number>(); // match number → winning team id

  const recordMatchup = (a: number, b: number, winner: number): void => {
    const key = pairKey(a, b);
    let mc = matchups.get(key);
    if (!mc) {
      mc = { lowId: Math.min(a, b), highId: Math.max(a, b), meetings: 0, lowWins: 0 };
      matchups.set(key, mc);
    }
    mc.meetings++;
    if (winner === mc.lowId) mc.lowWins++;
  };

  const r32Team = (feeder: R32Feeder, match: number, alloc: Map<number, GroupId>): number => {
    if (feeder.kind === "group") {
      const gi = groupIndex.get(feeder.group)!;
      return feeder.position === "winner" ? grpWinner[gi]! : grpRunner[gi]!;
    }
    return grpThird[groupIndex.get(alloc.get(match)!)!]!;
  };

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
    for (let gi = 0; gi < groups.length; gi++) {
      const gs = groups[gi]!;
      const scenario = gs.completed.slice();
      for (const r of gs.remaining) {
        const s = sampled[r.gidx]!;
        scenario.push({ homeId: r.homeId, awayId: r.awayId, homeGoals: s[0], awayGoals: s[1] });
      }
      const rows = buildOrderedRows(gs.teams, scenario);
      advancing.add(rows[0]!.teamId);
      advancing.add(rows[1]!.teamId);
      if (rows[2]) thirdRows.push(rows[2]);
      grpWinner[gi] = rows[0]!.teamId;
      grpRunner[gi] = rows[1]!.teamId;
      grpThird[gi] = rows[2] ? rows[2].teamId : 0;
      positionCount.get(rows[0]!.teamId)!.first++;
      if (rows[1]) positionCount.get(rows[1].teamId)!.second++;
      if (rows[2]) positionCount.get(rows[2].teamId)!.third++;
    }

    const qualifiedThirds = rankThirdPlaced(thirdRows).qualified;
    for (const id of qualifiedThirds) advancing.add(id);

    for (const id of advancing) advanceCount.set(id, advanceCount.get(id)! + 1);

    if (playoutKnockout) {
      const alloc = allocateThirds(qualifiedThirds.map((id) => teamGroup.get(id)!));
      koWinner.clear();
      // Round of 32: participants come from the trial's group results + allocation.
      for (const layout of R32_LAYOUT) {
        const a = r32Team(layout.home, layout.match, alloc);
        const b = r32Team(layout.away, layout.match, alloc);
        const w = playKnockout(a, b, "R32");
        koWinner.set(layout.match, w);
        recordMatchup(a, b, w);
        stageReach.get(w)!.r16++;
      }
      // R16 → Final: participants are the winners of the two feeding matches.
      for (const layout of KO_LAYOUT) {
        const a = koWinner.get(layout.home)!;
        const b = koWinner.get(layout.away)!;
        const w = playKnockout(a, b, layout.stage as Stage);
        koWinner.set(layout.match, w);
        recordMatchup(a, b, w);
        stageReach.get(w)![REACH_BY_WINNING[layout.stage]]++;
      }

      // Survival: count rounds through which every prediction pick matched this
      // trial. Already-decided real results are fixed in koWinner, so survival is
      // measured "as it stands".
      if (trackSurvival) {
        for (const stage of ORDERED_STAGES) {
          let aliveThroughRound = true;
          for (const num of STAGE_MATCH_NUMBERS[stage]) {
            const picked = predByMatch.get(num);
            if (picked !== undefined && picked !== koWinner.get(num)) {
              aliveThroughRound = false;
              break;
            }
          }
          if (!aliveThroughRound) break;
          survivalByStage[stage]++;
        }
      }
    }

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

  return { trials, advanceCount, positionCount, conditional, stageReach, matchups, survivalByStage };
}
