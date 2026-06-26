// Deep-run probabilities: each team's chance of reaching every knockout stage,
// plus conditional win odds for the pairings that actually occur. Built on the
// bracket play-out in `simulate` (Layer 2). Settled cases are pinned exactly via
// the deterministic verdict, so a team that cannot reach the Round of 32 reports
// zero for every knockout stage rather than relying on sampling noise.

import type { TournamentSnapshot } from "../data/models";
import { computeQualificationVerdicts } from "./verdict";
import { simulate, type SimulateOptions } from "./montecarlo";

export type KnockoutMethod = "eliminated" | "simulated";

export interface KnockoutTeamOdds {
  teamId: number;
  abbr: string;
  name: string;
  groupId: string;
  /** Probabilities of reaching each stage, each in [0, 1], non-increasing. */
  reachR16: number;
  reachQF: number;
  reachSF: number;
  reachFinal: number;
  champion: number;
  method: KnockoutMethod;
}

export interface MatchupOdds {
  aTeamId: number;
  bTeamId: number;
  /** Trials in which this pairing occurred. */
  meetings: number;
  /** P(a beats b | they meet). `bWinProb` is 1 - aWinProb. */
  aWinProb: number;
  bWinProb: number;
}

export interface KnockoutOddsReport {
  trials: number;
  teams: KnockoutTeamOdds[];
  /** One entry per pairing that occurred in at least one trial. */
  matchups: MatchupOdds[];
}

function freq(count: number, trials: number): number {
  return trials > 0 ? count / trials : 0;
}

/**
 * Per-team deep-run probabilities (reach R16/QF/SF/Final/Champion) and per-pairing
 * conditional win probabilities, by simulating the bracket.
 */
export function knockoutProbabilities(
  snapshot: TournamentSnapshot,
  opts: SimulateOptions = {},
): KnockoutOddsReport {
  const sim = simulate(snapshot, { ...opts, playoutKnockout: true });

  // Deterministic status pins teams that cannot reach the Round of 32.
  const eliminated = new Set<number>();
  for (const g of snapshot.groups) {
    for (const tq of computeQualificationVerdicts(snapshot, g.id).teams) {
      if (tq.advancement === "eliminated") eliminated.add(tq.teamId);
    }
  }

  const teams: KnockoutTeamOdds[] = [];
  for (const g of snapshot.groups) {
    for (const t of g.teams) {
      if (eliminated.has(t.id)) {
        teams.push({
          teamId: t.id,
          abbr: t.abbr,
          name: t.name,
          groupId: g.id,
          reachR16: 0,
          reachQF: 0,
          reachSF: 0,
          reachFinal: 0,
          champion: 0,
          method: "eliminated",
        });
        continue;
      }
      const sr = sim.stageReach.get(t.id);
      teams.push({
        teamId: t.id,
        abbr: t.abbr,
        name: t.name,
        groupId: g.id,
        reachR16: freq(sr?.r16 ?? 0, sim.trials),
        reachQF: freq(sr?.qf ?? 0, sim.trials),
        reachSF: freq(sr?.sf ?? 0, sim.trials),
        reachFinal: freq(sr?.final ?? 0, sim.trials),
        champion: freq(sr?.champion ?? 0, sim.trials),
        method: "simulated",
      });
    }
  }

  const matchups: MatchupOdds[] = [];
  for (const mc of sim.matchups.values()) {
    const aWinProb = freq(mc.lowWins, mc.meetings);
    matchups.push({
      aTeamId: mc.lowId,
      bTeamId: mc.highId,
      meetings: mc.meetings,
      aWinProb,
      bWinProb: 1 - aWinProb,
    });
  }

  return { trials: sim.trials, teams, matchups };
}
