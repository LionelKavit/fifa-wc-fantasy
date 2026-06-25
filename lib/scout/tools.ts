// Engine/grounding-backed tools the Scout can call, plus the team/group name
// resolver they (and the keyless fallback) share. Every handler returns grounded
// facts from the grounding layer — never a number the model could fabricate.

import type { TournamentSnapshot } from "../data/models";
import type { AdvancementReport } from "../engine";
import { buildTeamSituation, buildGroupSituation } from "../grounding";

export interface ResolvedTeam {
  teamId: number;
  abbr: string;
  name: string;
  groupId: string;
}

// A few common nicknames → a substring of the official name.
const TEAM_ALIASES: Record<string, string> = {
  usa: "united states",
  "south korea": "korea",
  holland: "netherlands",
  "czech republic": "czechia",
};

// Name words too generic to identify a team on their own.
const GENERIC_NAME_WORDS = new Set(["republic", "united", "ir", "rep", "dr", "and", "the"]);

const words = (s: string, re: RegExp) => s.split(re).filter(Boolean);

function toResolved(t: { id: number; abbr: string; name: string; group: string }): ResolvedTeam {
  return { teamId: t.id, abbr: t.abbr, name: t.name, groupId: t.group };
}

/**
 * Resolve a team from a name, abbreviation, or a free-form question that
 * mentions one. Tries exact abbr/name, then matches on word tokens — so
 * "korea" finds "Korea Republic" and "what does mexico need?" finds Mexico —
 * while ignoring generic words and only honoring an abbreviation when typed in
 * uppercase (so "can" doesn't match Canada).
 */
export function resolveTeam(snapshot: TournamentSnapshot, query: string): ResolvedTeam | null {
  const original = query.trim();
  const raw = original.toLowerCase();
  const q = TEAM_ALIASES[raw] ?? raw;

  // 1. Exact abbreviation or full name.
  const exact =
    snapshot.teams.find((t) => t.abbr.toLowerCase() === q) ??
    snapshot.teams.find((t) => t.name.toLowerCase() === q);
  if (exact) return toResolved(exact);

  // 2. Word-token matching against the (free-form) query.
  const queryWords = new Set(words(q, /[^a-z]+/));
  const upperWords = new Set(words(original, /[^A-Za-z]+/)); // case preserved, for abbreviations

  let best: { team: (typeof snapshot.teams)[number]; score: number } | null = null;
  for (const t of snapshot.teams) {
    const name = t.name.toLowerCase();
    let score = 0;
    if (q.includes(name)) score = Math.max(score, 100 + name.length); // full name phrase present
    if (upperWords.has(t.abbr)) score = Math.max(score, 50 + t.abbr.length); // abbr, only if uppercase
    for (const tok of words(name, /[^a-z]+/)) {
      if (tok.length >= 4 && !GENERIC_NAME_WORDS.has(tok) && queryWords.has(tok)) {
        score = Math.max(score, tok.length);
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { team: t, score };
  }

  return best ? toResolved(best.team) : null;
}

/** Resolve a group id (a–l) from "Group F", "group f", or a bare letter. */
export function resolveGroup(snapshot: TournamentSnapshot, query: string): string | null {
  const q = query.toLowerCase();
  const m = q.match(/group\s+([a-l])\b/);
  let letter = m?.[1];
  if (!letter) {
    const trimmed = q.trim();
    if (/^[a-l]$/.test(trimmed)) letter = trimmed;
  }
  if (!letter) return null;
  return snapshot.groups.some((g) => g.id === letter) ? letter : null;
}

/** Per-turn context threaded through every tool call so facts stay consistent. */
export interface ScoutContext {
  snapshot: TournamentSnapshot;
  report: AdvancementReport;
}

export interface ToolResult {
  output: string;
  isError: boolean;
}

const ok = (data: unknown): ToolResult => ({ output: JSON.stringify(data), isError: false });
const fail = (message: string): ToolResult => ({ output: JSON.stringify({ error: message }), isError: true });

function asNonEmptyString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

// A small percentage helper for compact, model-friendly tool output.
const asPct = (p: number | null): string | null => (p === null ? null : `${Math.round(p * 100)}%`);

/** Tool definitions in Anthropic Messages API shape. Kept minimal (two tools) to
 * shrink the prompt and avoid extra round-trips; both resolve names internally. */
export const SCOUT_TOOLS = [
  {
    name: "get_team_situation",
    description:
      "A team's qualification facts: status, what it needs, and its chance to reach the Round of 32. Use for any team question (resolves the team name itself).",
    input_schema: {
      type: "object",
      properties: { team: { type: "string", description: "Team name or abbreviation, e.g. 'Mexico' or 'MEX'." } },
      required: ["team"],
    },
  },
  {
    name: "get_group_situation",
    description: "A group's facts: each team's status and chance. Use for any group question (resolves the group name itself).",
    input_schema: {
      type: "object",
      properties: { group: { type: "string", description: "Group name or letter, e.g. 'Group F' or 'F'." } },
      required: ["group"],
    },
  },
] as const;

/** Execute a tool call against grounded data, returning a COMPACT result to keep
 * tool-result tokens small. Returns a tool error rather than throwing. */
export function executeTool(name: string, input: unknown, ctx: ScoutContext): ToolResult {
  const args = (input ?? {}) as Record<string, unknown>;
  try {
    switch (name) {
      case "get_team_situation": {
        const q = asNonEmptyString(args.team);
        if (!q) return fail("'team' is required");
        const team = resolveTeam(ctx.snapshot, q);
        if (!team) return ok({ found: false, query: q });
        const s = buildTeamSituation(ctx.snapshot, team.teamId, ctx.report);
        return ok({
          team: s.name,
          group: s.groupId,
          status: s.advancement,
          chance: asPct(s.advancementProbability),
          conditional: s.conditionalProbability
            ? { win: asPct(s.conditionalProbability.win), draw: asPct(s.conditionalProbability.draw), loss: asPct(s.conditionalProbability.loss) }
            : null,
          summary: s.narration,
        });
      }
      case "get_group_situation": {
        const q = asNonEmptyString(args.group);
        if (!q) return fail("'group' is required");
        const groupId = resolveGroup(ctx.snapshot, q);
        if (!groupId) return ok({ found: false, query: q });
        const g = buildGroupSituation(ctx.snapshot, groupId, ctx.report);
        return ok({
          group: g.groupId,
          summary: g.narration,
          teams: g.teams.map((t) => ({ team: t.abbr, status: t.advancement, chance: asPct(t.advancementProbability) })),
        });
      }
      default:
        return fail(`unknown tool '${name}'`);
    }
  } catch (e) {
    return fail((e as Error).message);
  }
}
