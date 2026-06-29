// Bracket prediction model — a fan's filled-in knockout bracket.
//
// Pure overlay on a concrete `Bracket` (from `bracket.ts`): picks are stored
// sparsely as matchId → predicted winning team id, and everything else (the
// predicted participants of later matches, completeness, the champion) is
// derived. Picks propagate up the tree, so editing an earlier pick cascade-clears
// any later pick that is no longer reachable. No storage or UI concerns live here.

import type { TournamentSnapshot } from "../data/models";
import type {
  Bracket,
  BracketMatch,
  KnockoutStage,
  Prediction,
  PredictionCompleteness,
  PredictionView,
} from "./types";

const KNOCKOUT_STAGES: KnockoutStage[] = ["R32", "R16", "QF", "SF", "F"];

/** A fresh prediction with no picks. */
export function emptyPrediction(): Prediction {
  return new Map<string, number>();
}

/** Map each feeder match id → the match it feeds (its single downstream match). */
function childMap(bracket: Bracket): Map<string, string> {
  const child = new Map<string, string>();
  for (const m of bracket.matches) {
    for (const s of m.slots) {
      if (s.feeder.kind === "matchWinner") child.set(s.feeder.matchId, m.id);
    }
  }
  return child;
}

function matchById(bracket: Bracket): Map<string, BracketMatch> {
  return new Map(bracket.matches.map((m) => [m.id, m]));
}

/**
 * The two predicted participants of a match: for the Round of 32, the bracket's
 * resolved slot teams; for later rounds, the predicted winners of the two feeder
 * matches. An entry is null when that participant is not yet determined.
 */
export function predictedParticipants(
  bracket: Bracket,
  prediction: Prediction,
  matchId: string,
): [number | null, number | null] {
  const match = matchById(bracket).get(matchId);
  if (!match) return [null, null];
  const resolve = (slotIndex: 0 | 1): number | null => {
    const slot = match.slots[slotIndex]!;
    if (slot.feeder.kind === "matchWinner") return prediction.get(slot.feeder.matchId) ?? null;
    return slot.team ? slot.team.teamId : null;
  };
  return [resolve(0), resolve(1)];
}

/**
 * `true` once the first knockout match has kicked off (any knockout fixture is
 * live/complete, or its kickoff has been reached as of the snapshot). Derived
 * from the snapshot, never wall-clock.
 */
export function isPredictionLocked(snapshot: TournamentSnapshot): boolean {
  const asOf = Date.parse(snapshot.fetchedAt);
  return snapshot.fixtures.some((f) => {
    if (f.stage === "GROUP") return false;
    if (f.status === "live" || f.status === "complete") return true;
    const ko = Date.parse(f.kickoff);
    return Number.isFinite(ko) && Number.isFinite(asOf) && ko <= asOf;
  });
}

/** Real winners of decided knockout matches (fixture complete with a derivable winner),
 * matchId → teamId. A live or scheduled match has no winner yet, so it is not decided. */
export function decidedWinners(bracket: Bracket): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of bracket.matches) if (m.winner) out.set(m.id, m.winner.teamId);
  return out;
}

/** Whether a match's real result is in — once decided it is locked to that winner. */
export function isMatchDecided(bracket: Bracket, matchId: string): boolean {
  return matchById(bracket).get(matchId)?.winner != null;
}

/**
 * Overlay the decided real winners onto a prediction (decided results win), clearing any
 * downstream pick they contradict. This "effective" prediction is what the UI renders and
 * the model evaluates: a decided match shows its real winner and that winner advances.
 */
export function withDecided(bracket: Bracket, prediction: Prediction): Prediction {
  const decided = decidedWinners(bracket);
  if (decided.size === 0) return prediction;
  const child = childMap(bracket);
  const next = new Map(prediction);
  for (const m of bracket.matches) {
    // R32 → Final order, so an upstream decided winner is in place before its child.
    const w = decided.get(m.id);
    if (w === undefined) continue;
    if (next.get(m.id) !== w) {
      next.set(m.id, w);
      cascadeClear(next, bracket, child, m.id);
    }
  }
  return next;
}

/** Clear any downstream picks made invalid by a change at `fromMatchId`. */
function cascadeClear(picks: Prediction, bracket: Bracket, child: Map<string, string>, fromMatchId: string): void {
  let cur = child.get(fromMatchId);
  while (cur) {
    const [a, b] = predictedParticipants(bracket, picks, cur);
    const pick = picks.get(cur);
    if (pick !== undefined && pick !== a && pick !== b) {
      picks.delete(cur);
      cur = child.get(cur);
    } else {
      break; // pick still valid (or none) → downstream unaffected
    }
  }
}

/**
 * Pick a winner for a match. Rejected (prediction returned unchanged) if the match is
 * already decided (its real result is in) or the team is not a current predicted
 * participant. Otherwise sets the pick and cascade-clears now-invalid later picks.
 */
export function pick(
  _snapshot: TournamentSnapshot,
  bracket: Bracket,
  prediction: Prediction,
  matchId: string,
  teamId: number,
): Prediction {
  if (isMatchDecided(bracket, matchId)) return prediction; // a decided match stays decided
  const [a, b] = predictedParticipants(bracket, prediction, matchId);
  if (teamId !== a && teamId !== b) return prediction;
  const next = new Map(prediction);
  next.set(matchId, teamId);
  cascadeClear(next, bracket, childMap(bracket), matchId);
  return next;
}

/** Clear a match's pick (and any now-invalid downstream picks). Rejected if the match is
 * decided (its real result stands). */
export function clear(
  _snapshot: TournamentSnapshot,
  bracket: Bracket,
  prediction: Prediction,
  matchId: string,
): Prediction {
  if (isMatchDecided(bracket, matchId)) return prediction;
  if (!prediction.has(matchId)) return prediction;
  const next = new Map(prediction);
  next.delete(matchId);
  cascadeClear(next, bracket, childMap(bracket), matchId);
  return next;
}

/** Whether a pick references a current predicted participant of its match. */
function isValidPick(bracket: Bracket, prediction: Prediction, matchId: string): boolean {
  const pickId = prediction.get(matchId);
  if (pickId === undefined) return false;
  const [a, b] = predictedParticipants(bracket, prediction, matchId);
  return pickId === a || pickId === b;
}

export function completeness(bracket: Bracket, prediction: Prediction): PredictionCompleteness {
  if (prediction.size === 0) return "empty";
  const allValid = bracket.matches.every((m) => isValidPick(bracket, prediction, m.id));
  return allValid ? "complete" : "partial";
}

/** Derive the per-match winners, per-round survivors, and champion from picks. */
export function derivePrediction(bracket: Bracket, prediction: Prediction): PredictionView {
  const winners = new Map<string, number>();
  const survivorsByStage: Record<KnockoutStage, number[]> = { R32: [], R16: [], QF: [], SF: [], F: [] };
  for (const m of bracket.matches) {
    if (!isValidPick(bracket, prediction, m.id)) continue;
    const w = prediction.get(m.id)!;
    winners.set(m.id, w);
    survivorsByStage[m.stage].push(w);
  }
  const state = completeness(bracket, prediction);
  const finalMatch = bracket.byStage.F[0];
  const champion = state === "complete" && finalMatch ? (winners.get(finalMatch.id) ?? null) : null;
  return { completeness: state, winners, survivorsByStage, champion };
}

export { KNOCKOUT_STAGES };
