// Public entry point for the Scout agent. Server-side only — the Anthropic client
// and API key never reach client code. Consumed by the future chat endpoint.

export { askScout, streamScout, deterministicAnswer, SCOUT_MODEL } from "./scout";
export type { ScoutAnswer, AskScoutOptions, AnswerSource, StreamingClient, ConversationTurn, BracketContext } from "./scout";
export { resolveTeam, resolveGroup, executeTool, SCOUT_TOOLS } from "./tools";
export type { ResolvedTeam, ScoutContext, ToolResult } from "./tools";
export { SCOUT_SYSTEM_PROMPT } from "./prompt";
