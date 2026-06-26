// Per-team advancement probability. Combines the deterministic verdict (to pin
// settled cases exactly) with Monte Carlo frequency (for contended teams).

import type { TournamentSnapshot } from "../data/models";
import { computeQualificationVerdicts } from "./verdict";
import { simulate, type SimulateOptions } from "./montecarlo";

export type ProbabilityMethod = "clinched" | "eliminated" | "simulated";

export interface ConditionalProbability {
  win: number;
  draw: number;
  loss: number;
}

export interface TeamAdvancement {
  teamId: number;
  abbr: string;
  name: string;
  groupId: string;
  /** Probability of reaching the Round of 32, in [0, 1]. */
  probability: number;
  method: ProbabilityMethod;
  /** Advancement probability given the team's own next result; null when the team
   * has no single remaining fixture. */
  conditional: ConditionalProbability | null;
  /** Probability of finishing 1st / 2nd / 3rd in the group, each in [0, 1]. */
  finish: { first: number; second: number; third: number };
}

export interface AdvancementReport {
  trials: number;
  seed: number;
  teams: TeamAdvancement[];
}

function freq(advanced: number, trials: number): number {
  return trials > 0 ? advanced / trials : 0;
}

export function advancementProbabilities(
  snapshot: TournamentSnapshot,
  opts: SimulateOptions = {},
): AdvancementReport {
  const sim = simulate(snapshot, opts);

  // Deterministic advancement status per team (pins clinched/eliminated exactly).
  const status = new Map<number, string>();
  for (const g of snapshot.groups) {
    for (const tq of computeQualificationVerdicts(snapshot, g.id).teams) {
      status.set(tq.teamId, tq.advancement);
    }
  }

  const teams: TeamAdvancement[] = [];
  for (const g of snapshot.groups) {
    for (const t of g.teams) {
      const adv = status.get(t.id);
      let probability: number;
      let method: ProbabilityMethod;
      if (adv === "clinched") {
        probability = 1;
        method = "clinched";
      } else if (adv === "eliminated") {
        probability = 0;
        method = "eliminated";
      } else {
        probability = freq(sim.advanceCount.get(t.id) ?? 0, sim.trials);
        method = "simulated";
      }

      let conditional: ConditionalProbability | null = null;
      const cond = sim.conditional.get(t.id);
      if (cond) {
        if (method === "clinched") conditional = { win: 1, draw: 1, loss: 1 };
        else if (method === "eliminated") conditional = { win: 0, draw: 0, loss: 0 };
        else
          conditional = {
            win: freq(cond.win.advanced, cond.win.trials),
            draw: freq(cond.draw.advanced, cond.draw.trials),
            loss: freq(cond.loss.advanced, cond.loss.trials),
          };
      }

      const pos = sim.positionCount.get(t.id);
      const finish = {
        first: freq(pos?.first ?? 0, sim.trials),
        second: freq(pos?.second ?? 0, sim.trials),
        third: freq(pos?.third ?? 0, sim.trials),
      };

      teams.push({
        teamId: t.id,
        abbr: t.abbr,
        name: t.name,
        groupId: g.id,
        probability,
        method,
        conditional,
        finish,
      });
    }
  }

  return { trials: sim.trials, seed: opts.seed ?? 1, teams };
}
