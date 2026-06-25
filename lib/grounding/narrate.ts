// Deterministic plain-English narration of a situation. No LLM. Every sentence is
// generated purely from structured fields — the Scout adds personality later, but
// the *facts* live here, so a narrated claim can never drift from the data.

import type { OwnMatchConditions } from "../engine";
import type { TeamFacts, GroupFacts } from "./situation";

function pct(p: number): number {
  return Math.round(p * 100);
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Describe what an alive team needs in its own remaining match. */
function requiredResultPhrase(own: OwnMatchConditions): string {
  const opp = own.opponentAbbr;
  const clinch = (e: string) => e === "clinch";
  if (clinch(own.win) && clinch(own.draw)) {
    return `avoiding defeat against ${opp} secures a top-2 place`;
  }
  if (clinch(own.win)) {
    return own.draw === "depends"
      ? `a win over ${opp} guarantees a top-2 place, and a draw might be enough`
      : `a win over ${opp} guarantees a top-2 place`;
  }
  if (own.win === "depends") {
    return `even beating ${opp} may not be enough on its own — it could hinge on goal difference and other results`;
  }
  return `their top-2 hopes rest on other results going their way`;
}

export function narrateTeam(f: TeamFacts): string {
  const who = f.name;
  const G = f.groupId.toUpperCase();
  switch (f.advancement) {
    case "clinched":
      return `${who} have secured a top-2 finish in Group ${G} and are through to the Round of 32.`;
    case "eliminated":
      return `${who} are out — they can no longer finish in the top three of Group ${G}.`;
    case "thirdPlaceRace": {
      let s = `${who} can't reach the top two, but could still advance as one of the eight best third-placed teams.`;
      if (f.advancementProbability !== null) s += ` Our model puts that at about ${pct(f.advancementProbability)}%.`;
      return s;
    }
    case "contention": {
      const req = f.ownMatch ? requiredResultPhrase(f.ownMatch) : "their fate depends on results elsewhere";
      let s = `${who} are still in contention for a top-2 place — ${req}.`;
      if (f.advancementProbability !== null) {
        s += ` Overall we make them about ${pct(f.advancementProbability)}% to advance`;
        if (f.conditionalProbability) {
          const c = f.conditionalProbability;
          s += ` (${pct(c.win)}% with a win, ${pct(c.draw)}% with a draw, ${pct(c.loss)}% with a loss)`;
        }
        s += ".";
      }
      return s;
    }
  }
}

export function narrateGroup(g: GroupFacts): string {
  const G = g.groupId.toUpperCase();
  const abbrs = (status: string) => g.teams.filter((t) => t.advancement === status).map((t) => t.abbr);

  const clinched = abbrs("clinched");
  const contending = g.teams
    .filter((t) => t.advancement === "contention" || t.advancement === "thirdPlaceRace")
    .map((t) => t.abbr);
  const eliminated = abbrs("eliminated");

  const parts: string[] = [];
  if (clinched.length) parts.push(`${joinList(clinched)} ${clinched.length === 1 ? "has" : "have"} secured a top-2 spot`);
  if (contending.length) parts.push(`${joinList(contending)} ${contending.length === 1 ? "is" : "are"} still fighting to advance`);
  if (eliminated.length) parts.push(`${joinList(eliminated)} ${eliminated.length === 1 ? "is" : "are"} out`);

  if (!parts.length) return `Group ${G} is still wide open.`;
  return `Group ${G}: ${parts.join("; ")}.`;
}
