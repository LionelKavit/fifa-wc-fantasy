## 1. Dependencies & config

- [x] 1.1 Add `@anthropic-ai/sdk` dependency
- [x] 1.2 Read `ANTHROPIC_API_KEY` from server-side env only; document `.env.local` usage and ensure it is gitignored

## 2. Tools

- [x] 2.1 Implement a forgiving team/group name resolver (common names, abbreviations) in `lib/scout/tools.ts`
- [x] 2.2 Define tools `resolveTeam`, `getTeamSituation`, `getGroupSituation`, `getAdvancementProbabilities` with explicit input schemas, backed by the grounding layer
- [x] 2.3 Implement tool handlers that thread one `TournamentSnapshot` (and a single seeded advancement report) through a turn
- [x] 2.4 Unit-test tool handlers deterministically: resolution, grounded situation output, not-found path, schema-invalid call returns a tool error

## 3. Persona & prompt

- [x] 3.1 Write the frozen Scout system prompt in `lib/scout/prompt.ts`: concise WC analyst, ground all claims, distinguish certainty vs probability, decline the unanswerable, stay in scope

## 4. Conversation runner

- [x] 4.1 Implement the streaming tool-use loop in `lib/scout/scout.ts` with `claude-sonnet-4-6` + `thinking: {type: "adaptive"}`, executing tool calls and looping until end of turn (with a max-iterations guard)
- [x] 4.2 Stream the response (`streamScout`) and provide a buffered collector (`askScout`) that tags the answer source (`llm` | `deterministic`)
- [x] 4.3 Implement the deterministic fallback: when no key/client is available, resolve the team/group in the question and return the grounding narration, with a graceful default when nothing resolves
- [x] 4.4 Unit-test the loop with a mocked client: a tool-call turn triggers handler execution and feeds results back; end-of-turn terminates
- [x] 4.5 Unit-test the fallback (keyless): team named → team narration; group named → group narration; nothing recognized → graceful message
- [x] 4.6 Add a live smoke test that is skipped when `ANTHROPIC_API_KEY` is unset (asks "what does Mexico need?" and asserts a grounded, non-empty answer)
- [x] 4.7 Accept an optional conversation `history` and thread it into the request (and into the fallback's best-effort subject resolution); unit-test multi-turn on both paths

## 5. Public API

- [x] 5.1 Export the Scout runner from `lib/scout/index.ts` for the future chat endpoint to consume
- [x] 5.2 Verify no client-exposed module imports the API key or the Anthropic client
