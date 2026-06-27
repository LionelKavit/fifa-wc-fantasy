// The Scout conversation runner. Two paths:
//  - LLM path (when a key/client is available): a streaming tool-use loop with
//    claude-sonnet-4-6 (thinking off, low effort, brief answers); the model calls
//    grounded tools and composes a short answer that streams back.
//  - Deterministic fallback (keyless): resolve the team/group in the question and
//    return the grounding narration directly — no model call.

import Anthropic from "@anthropic-ai/sdk";
import type { TournamentSnapshot } from "../data/models";
import {
  advancementProbabilities,
  type AdvancementReport,
  type Prediction,
  type R32Projection,
  type OutcomeModel,
} from "../engine";
import { loadTournamentSnapshot } from "../data";
import { buildTeamSituation, buildGroupSituation } from "../grounding";
import { SCOUT_SYSTEM_PROMPT } from "./prompt";
import { SCOUT_TOOLS, executeTool, resolveTeam, resolveGroup, type ScoutContext } from "./tools";
import type { KnowledgeSnippet } from "../knowledge/parse";

export const SCOUT_MODEL = "claude-sonnet-4-6";
const DEFAULT_TRIALS = 20_000;
const MAX_TOOL_ITERATIONS = 6;

// Prompt caching. The cached prefix (tools + system) must clear the provider's
// 1024-token minimum for Sonnet or the breakpoint is silently ignored — the scope
// + security rules in the system prompt keep it well above that. A 1-hour TTL
// (extended-cache-ttl beta) suits a casual chat cadence, where turns routinely
// arrive more than the default 5 minutes apart.
const CACHE_CONTROL = { type: "ephemeral", ttl: "1h" } as const;
const EXTENDED_CACHE_TTL_BETA = "extended-cache-ttl-2025-04-11";

type ContentBlock = Record<string, unknown> & { type: string };

/**
 * Return a copy of `messages` with a cache breakpoint on the tail — the last
 * content block of the last message — so accumulated history (prior turns and the
 * tool-use loop's assistant/tool-result messages) is cached too, not just the
 * static prefix. We mark only the request copy, never the persistent `messages`,
 * so exactly one tail breakpoint exists at a time (keeping us within the 4-breakpoint
 * limit: one prefix + one tail).
 */
function withTailCache(
  messages: Array<{ role: string; content: unknown }>,
): Array<{ role: string; content: unknown }> {
  const last = messages[messages.length - 1];
  if (!last) return messages;
  const blocks: ContentBlock[] =
    typeof last.content === "string"
      ? [{ type: "text", text: last.content }]
      : (last.content as ContentBlock[]).map((b) => ({ ...b }));
  const tail = blocks[blocks.length - 1];
  if (!tail) return messages;
  blocks[blocks.length - 1] = { ...tail, cache_control: CACHE_CONTROL };
  const out = messages.slice();
  out[out.length - 1] = { ...last, content: blocks };
  return out;
}

export type AnswerSource = "llm" | "deterministic";

export interface ScoutAnswer {
  text: string;
  source: AnswerSource;
}

/** A prior turn in the conversation. */
export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AskScoutOptions {
  snapshot?: TournamentSnapshot;
  report?: AdvancementReport;
  /** Prior conversation turns, oldest first, so follow-ups have context. */
  history?: ConversationTurn[];
  /** Inject a client (e.g. a mock) to force the LLM path in tests. */
  client?: StreamingClient;
  /** Pass `null` to force the keyless fallback; omit to read process.env. */
  apiKey?: string | null;
  trials?: number;
  seed?: number;
  /** Optional bracket context for the unified Scout (predictor/tracker chat). */
  bracket?: BracketContext;
}

/** Bracket-aware context for the Scout's bracket/tracker tools. */
export interface BracketContext {
  prediction?: Prediction | null;
  poolSize?: number | null;
  model?: OutcomeModel;
  projection?: R32Projection;
  ratings?: Map<number, number>;
  championOdds?: Record<number, number>;
  /** P(a beats b) from the single head-to-head model — the source for compare_teams. */
  matchupWinProb?: (a: number, b: number) => number;
  /** Unverified expert/pundit snippets from the user's knowledge sources (may be empty). */
  expertNotes?: KnowledgeSnippet[];
}

// Minimal structural view of the Anthropic client we depend on (the real SDK
// client satisfies this; tests provide a fake). Keeps the loop easy to mock.
interface StreamEvent {
  type: string;
  delta?: { type: string; text?: string };
}
interface MessageLike {
  stop_reason: string | null;
  content: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>;
}
interface MessageStreamLike extends AsyncIterable<StreamEvent> {
  finalMessage(): Promise<MessageLike>;
}
export interface StreamingClient {
  messages: { stream(params: Record<string, unknown>): MessageStreamLike };
}

function buildContext(
  snapshot: TournamentSnapshot,
  report: AdvancementReport,
  bracket?: BracketContext,
): ScoutContext {
  return {
    snapshot,
    report,
    prediction: bracket?.prediction ?? null,
    poolSize: bracket?.poolSize ?? null,
    model: bracket?.model,
    projection: bracket?.projection,
    ratings: bracket?.ratings,
    championOdds: bracket?.championOdds,
    matchupWinProb: bracket?.matchupWinProb,
    expertNotes: bracket?.expertNotes,
    _eval: null,
  };
}

// A follow-up that refers back to the conversation rather than naming a subject.
const FOLLOW_UP = /\b(they|their|them|its|it|that|those|these|chance|chances|odds|advance|qualify|through|scenario|group|need)\b/i;

const GRACEFUL =
  'I can tell you what any team needs to advance, or how a group is shaping up. Try naming a team (e.g. "What does Mexico need?") or a group (e.g. "Group F").';

function answerFromText(
  text: string,
  snapshot: TournamentSnapshot,
  report: AdvancementReport,
): string | null {
  const team = resolveTeam(snapshot, text);
  if (team) return buildTeamSituation(snapshot, team.teamId, report).narration;

  const groupId = resolveGroup(snapshot, text);
  if (groupId) {
    const g = buildGroupSituation(snapshot, groupId, report);
    return [g.narration, ...g.teams.map((t) => `• ${t.narration}`)].join("\n");
  }
  return null;
}

/** Deterministic, no-LLM answer from the grounding layer. Resolves the team/group
 * named in the question; for a follow-up that refers back but names none, falls
 * back to the most recent subject in `history`; otherwise a graceful default. */
export function deterministicAnswer(
  question: string,
  snapshot: TournamentSnapshot,
  report: AdvancementReport,
  history: ConversationTurn[] = [],
): string {
  const direct = answerFromText(question, snapshot, report);
  if (direct) return direct;

  // Only dredge history for genuine follow-ups — not greetings or chit-chat.
  if (FOLLOW_UP.test(question)) {
    for (const turn of [...history].reverse()) {
      const fromHistory = answerFromText(turn.content, snapshot, report);
      if (fromHistory) return fromHistory;
    }
  }

  return GRACEFUL;
}

/**
 * Stream the Scout's answer to a question. Yields text chunks. Uses the LLM
 * tool-use loop when a client/key is available, otherwise yields the
 * deterministic fallback answer as a single chunk.
 */
export async function* streamScout(
  question: string,
  opts: AskScoutOptions = {},
): AsyncGenerator<string, AnswerSource, void> {
  const snapshot = opts.snapshot ?? (await loadTournamentSnapshot());
  const report =
    opts.report ?? advancementProbabilities(snapshot, { trials: opts.trials ?? DEFAULT_TRIALS, seed: opts.seed ?? 1 });

  const apiKey = opts.apiKey === null ? null : (opts.apiKey ?? process.env.ANTHROPIC_API_KEY ?? null);
  const client: StreamingClient | null =
    opts.client ??
    (apiKey
      ? (new Anthropic({
          apiKey,
          // Enable the 1-hour cache TTL used on the cache_control breakpoints below.
          defaultHeaders: { "anthropic-beta": EXTENDED_CACHE_TTL_BETA },
        }) as unknown as StreamingClient)
      : null);

  const history = opts.history ?? [];

  if (!client) {
    yield deterministicAnswer(question, snapshot, report, history);
    return "deterministic";
  }

  const ctx = buildContext(snapshot, report, opts.bracket);
  const messages: Array<{ role: string; content: unknown }> = [
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user", content: question },
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const stream = client.messages.stream({
      model: SCOUT_MODEL,
      max_tokens: 512,
      // Thinking off + low effort: this is grounded Q&A, not a reasoning task — saves
      // most of the would-be output tokens.
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      // Cache the stable prefix (tools + system) so it isn't re-billed each turn,
      // plus a second breakpoint on the conversation tail so accumulated history
      // (prior turns + tool-loop messages) is read from cache rather than reprocessed.
      system: [{ type: "text", text: SCOUT_SYSTEM_PROMPT, cache_control: CACHE_CONTROL }],
      tools: SCOUT_TOOLS,
      messages: withTailCache(messages),
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
        yield event.delta.text;
      }
    }

    const message = await stream.finalMessage();
    if (message.stop_reason !== "tool_use") return "llm";

    messages.push({ role: "assistant", content: message.content });
    const toolResults = message.content
      .filter((b) => b.type === "tool_use")
      .map((b) => {
        const result = executeTool(b.name!, b.input, ctx);
        return { type: "tool_result", tool_use_id: b.id, content: result.output, is_error: result.isError };
      });
    messages.push({ role: "user", content: toolResults });
  }

  return "llm";
}

/** Buffered convenience wrapper: collect the streamed answer and tag its source. */
export async function askScout(question: string, opts: AskScoutOptions = {}): Promise<ScoutAnswer> {
  const gen = streamScout(question, opts);
  let text = "";
  let result = await gen.next();
  while (!result.done) {
    text += result.value;
    result = await gen.next();
  }
  return { text, source: result.value };
}
