// Pool-finish evaluator — "will this bracket win my pool?"
//
// An opponent-field Monte Carlo. Per trial we play out ONE knockout outcome over
// the fixed Round-of-32 field, then score the user's bracket AND a freshly-sampled
// field of opponents against that SAME outcome (common random numbers), and record
// the user's rank. Aggregating over trials gives a win probability, a finish
// distribution, and the user's own points range. Opponents are sampled chalk-biased
// (q ∝ p^γ) so the simulated public is chalkier than the model — the way real pools
// behave. Pure and seeded: identical inputs reproduce exactly.
//
// Hot-path note: the bracket is flattened once into `Node[]` (R32 = fixed teams,
// later rounds = feeder match numbers) so participant resolution is O(1). The loop
// never calls `predictedParticipants` (which rebuilds a map each call).

import type { TournamentSnapshot } from "../data/models";
import type { Prediction, KnockoutStage, Bracket } from "./types";
import { buildBracket, type R32Projection } from "./bracket";
import { completeness, predictedParticipants } from "./prediction";
import { DEFAULT_STAGE_WEIGHTS, UPSET_MULTIPLIER_CUTOFFS, upsetMultiplier, type UpsetCutoffs } from "./predictionScore";
import { mulberry32, samplePoisson, type Rng } from "./rng";
import { DEFAULT_KO_EXTRA_TIME_LAMBDA } from "./montecarlo";
import type { OutcomeModel } from "./outcome";
import { R32_LAYOUT, KO_LAYOUT } from "./bracketLayout";

/** Public-pick chalk bias: opponents pick the favorite with share ∝ p^γ. γ > 1 makes
 * the simulated field chalkier than the model (real pools over-pick favorites). */
export const PUBLIC_CHALK_GAMMA = 1.6;
const DEFAULT_TRIALS = 4000;
const DEFAULT_SEED = 1;

/** P(a beats b) for the upset multiplier and the chalk bias — the caller's Elo head-to-head. */
export type MatchupWinProb = (a: number, b: number) => number;

export interface PoolFinishOptions {
  poolSize: number;
  matchupWinProb: MatchupWinProb;
  model: OutcomeModel;
  /** Projection used to fill the R32 before the real draw, so the bracket has a field. */
  projection?: R32Projection;
  /** Chalk bias for the opponent field (default `PUBLIC_CHALK_GAMMA`). */
  gamma?: number;
  cutoffs?: UpsetCutoffs;
  seed?: number;
  trials?: number;
  /** Already-decided knockout results (match number → real winner) so the playout
   * respects results "as it stands". */
  decided?: Map<number, number>;
}

export interface PointsRange {
  p10: number;
  p50: number;
  p90: number;
  mean: number;
}

export type PoolFinishResult =
  | { complete: false }
  | {
      complete: true;
      /** Probability the bracket finishes first (fractional credit on ties). */
      winProbability: number;
      /** Expected finishing position, 1 = first. */
      expectedFinish: number;
      /** Probability of each finishing rank; index 0 = rank 1. Sums to 1. */
      finishDistribution: number[];
      /** Percentiles of the user's own score across trials. */
      pointsRange: PointsRange;
    };

/** Leverage of one pick: how much it moves the win probability vs. taking the favorite. */
export interface PickLeverage {
  matchId: string;
  /** winProb(your bracket) − winProb(this pick flipped to the favorite). Positive = the pick helps. */
  delta: number;
}

/** A pick reduced to what scoring needs: which match, which team, and its potential points. */
interface Potential {
  matchNumber: number;
  team: number;
  points: number;
}

/** A flattened bracket match: fixed R32 teams, or the feeder match numbers for later rounds. */
interface Node {
  num: number;
  stage: KnockoutStage;
  aTeam: number | null; // set for R32
  bTeam: number | null;
  aFrom: number; // feeder match number for later rounds, else -1
  bFrom: number;
}

/** Flatten the bracket once: R32 with fixed teams, then R16→Final with feeder numbers. */
function buildNodes(bracket: Bracket): Node[] {
  const r32 = new Map<number, [number | null, number | null]>();
  for (const m of bracket.matches) {
    if (m.stage === "R32") r32.set(m.matchNumber, [m.slots[0].team?.teamId ?? null, m.slots[1].team?.teamId ?? null]);
  }
  const nodes: Node[] = [];
  for (const layout of R32_LAYOUT) {
    const [a, b] = r32.get(layout.match) ?? [null, null];
    nodes.push({ num: layout.match, stage: "R32", aTeam: a, bTeam: b, aFrom: -1, bFrom: -1 });
  }
  for (const layout of KO_LAYOUT) {
    nodes.push({ num: layout.match, stage: layout.stage, aTeam: null, bTeam: null, aFrom: layout.home, bFrom: layout.away });
  }
  return nodes;
}

const resolveA = (node: Node, picks: Map<number, number>): number | null =>
  node.aTeam ?? picks.get(node.aFrom) ?? null;
const resolveB = (node: Node, picks: Map<number, number>): number | null =>
  node.bTeam ?? picks.get(node.bFrom) ?? null;

/** Each pick's potential points (`roundBase × upsetMultiplier`), fixed pre-tournament. */
function potentialsFor(
  nodes: Node[],
  picks: Map<number, number>,
  matchupWinProb: MatchupWinProb,
  cutoffs: UpsetCutoffs,
): Potential[] {
  const out: Potential[] = [];
  for (const node of nodes) {
    const team = picks.get(node.num);
    if (team === undefined) continue;
    const a = resolveA(node, picks);
    const b = resolveB(node, picks);
    const opponent = team === a ? b : team === b ? a : null;
    const winProb = opponent === null ? 0.5 : matchupWinProb(team, opponent);
    out.push({ matchNumber: node.num, team, points: DEFAULT_STAGE_WEIGHTS[node.stage] * upsetMultiplier(winProb, cutoffs) });
  }
  return out;
}

/** Sum the potentials whose picked team won that match in the trial's outcome. */
function scoreAgainstOutcome(potentials: Potential[], ko: Map<number, number>): number {
  let total = 0;
  for (const p of potentials) if (ko.get(p.matchNumber) === p.team) total += p.points;
  return total;
}

/** Play out one knockout (R32 → Final) over the fixed R32 field. Decided real results,
 * when supplied, are fixed; the rest are sampled from the model. */
function playout(nodes: Node[], model: OutcomeModel, rng: Rng, decided?: Map<number, number>): Map<number, number> {
  const ko = new Map<number, number>();
  for (const node of nodes) {
    const a = resolveA(node, ko);
    const b = resolveB(node, ko);
    if (a === null || b === null) continue;
    const real = decided?.get(node.num);
    if (real !== undefined) {
      ko.set(node.num, real);
      continue;
    }
    const [ha, hb] = model({ homeId: a, awayId: b }, rng);
    if (ha !== hb) {
      ko.set(node.num, ha > hb ? a : b);
      continue;
    }
    const ea = samplePoisson(DEFAULT_KO_EXTRA_TIME_LAMBDA, rng);
    const eb = samplePoisson(DEFAULT_KO_EXTRA_TIME_LAMBDA, rng);
    ko.set(node.num, ea !== eb ? (ea > eb ? a : b) : rng() < 0.5 ? a : b);
  }
  return ko;
}

/** Sample one chalk-biased, feasible opponent bracket (by match number): top-down, share ∝ p^γ. */
function sampleOpponentNodes(nodes: Node[], matchupWinProb: MatchupWinProb, gamma: number, rng: Rng): Map<number, number> {
  const picks = new Map<number, number>();
  for (const node of nodes) {
    const a = resolveA(node, picks);
    const b = resolveB(node, picks);
    if (a === null || b === null) continue;
    const pa = matchupWinProb(a, b);
    const qa = pa ** gamma;
    const qb = (1 - pa) ** gamma;
    const total = qa + qb;
    picks.set(node.num, total <= 0 || rng() < qa / total ? a : b);
  }
  return picks;
}

/** Convert a prediction (match id → team) to a by-match-number map. */
function byNumber(prediction: Prediction): Map<number, number> {
  const m = new Map<number, number>();
  for (const [matchId, team] of prediction) m.set(Number(matchId.slice(1)), team);
  return m;
}

/**
 * Estimate how a complete bracket places in a pool of `poolSize`. Returns an
 * incomplete signal for an unfinished bracket.
 */
export function evaluatePoolFinish(
  snapshot: TournamentSnapshot,
  prediction: Prediction,
  opts: PoolFinishOptions,
): PoolFinishResult {
  const bracket = buildBracket(snapshot, { projection: opts.projection });
  if (completeness(bracket, prediction) !== "complete") return { complete: false };

  const gamma = opts.gamma ?? PUBLIC_CHALK_GAMMA;
  const cutoffs = opts.cutoffs ?? UPSET_MULTIPLIER_CUTOFFS;
  const trials = opts.trials ?? DEFAULT_TRIALS;
  const poolSize = Math.max(1, Math.floor(opts.poolSize));
  const opponents = poolSize - 1;
  const rng = mulberry32(opts.seed ?? DEFAULT_SEED);

  const nodes = buildNodes(bracket);
  const userPotentials = potentialsFor(nodes, byNumber(prediction), opts.matchupWinProb, cutoffs);

  const finishCounts = new Array<number>(poolSize).fill(0);
  const userScores: number[] = new Array(trials);
  let winSum = 0;

  for (let t = 0; t < trials; t++) {
    const ko = playout(nodes, opts.model, rng, opts.decided);
    const userScore = scoreAgainstOutcome(userPotentials, ko);
    userScores[t] = userScore;

    let strictlyAbove = 0;
    let tiedAtTop = 0;
    for (let k = 0; k < opponents; k++) {
      const oppPicks = sampleOpponentNodes(nodes, opts.matchupWinProb, gamma, rng);
      const oppScore = scoreAgainstOutcome(potentialsFor(nodes, oppPicks, opts.matchupWinProb, cutoffs), ko);
      if (oppScore > userScore) strictlyAbove++;
      else if (oppScore === userScore) tiedAtTop++;
    }

    finishCounts[strictlyAbove] = (finishCounts[strictlyAbove] ?? 0) + 1; // rank = strictlyAbove + 1
    if (strictlyAbove === 0) winSum += 1 / (1 + tiedAtTop);
  }

  const finishDistribution = finishCounts.map((c) => c / trials);
  const expectedFinish = finishDistribution.reduce((s, p, i) => s + p * (i + 1), 0);

  return {
    complete: true,
    winProbability: winSum / trials,
    expectedFinish,
    finishDistribution,
    pointsRange: pointsRange(userScores),
  };
}

/** Per-pick leverage on the win probability. On-demand (≈ one extra evaluation per
 * non-favorite pick); pass a reduced `trials` for a quick read. */
export function pickLeverage(
  snapshot: TournamentSnapshot,
  prediction: Prediction,
  opts: PoolFinishOptions,
): PickLeverage[] {
  const base = evaluatePoolFinish(snapshot, prediction, opts);
  if (!base.complete) return [];
  const bracket = buildBracket(snapshot, { projection: opts.projection });

  const out: PickLeverage[] = [];
  for (const [matchId, picked] of prediction) {
    const [a, b] = predictedParticipants(bracket, prediction, matchId);
    if (a === null || b === null) continue;
    const favorite = opts.matchupWinProb(a, b) >= 0.5 ? a : b;
    if (picked === favorite) continue; // already the favorite → no leverage to report

    const counterfactual = new Map(prediction);
    counterfactual.set(matchId, favorite);
    const flipped = evaluatePoolFinish(snapshot, counterfactual, opts); // same seed → common random numbers
    if (!flipped.complete) continue;
    out.push({ matchId, delta: base.winProbability - flipped.winProbability });
  }
  return out;
}

/** Sample one chalk-biased, feasible opponent bracket (by match id). Exposed for testing
 * and reuse; the hot loop uses the by-number form internally. */
export function sampleOpponentBracket(
  bracket: Bracket,
  matchupWinProb: MatchupWinProb,
  gamma: number,
  rng: Rng,
): Prediction {
  const byNum = sampleOpponentNodes(buildNodes(bracket), matchupWinProb, gamma, rng);
  const pred: Prediction = new Map();
  for (const [num, team] of byNum) pred.set(`M${num}`, team);
  return pred;
}

/** Percentiles (nearest-rank) and mean of a score sample. */
function pointsRange(scores: number[]): PointsRange {
  const sorted = scores.slice().sort((x, y) => x - y);
  const at = (q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  const mean = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
  return { p10: at(0.1), p50: at(0.5), p90: at(0.9), mean };
}
