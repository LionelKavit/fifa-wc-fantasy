## Context

The Scout is the conversational face of the app. It must answer free-form questions ("what does the USA need?", "who should I root for?") in plain English, grounded in the engine so it never invents a probability. The grounding layer already turns engine outputs into structured facts + narration; the Scout's job is to pick the right facts (via tools) and phrase an answer. Verified API facts (from the claude-api skill): use `@anthropic-ai/sdk`, model `claude-sonnet-4-6`, adaptive thinking (`thinking: {type: "adaptive"}`), stream long responses, and prefer the tool runner or a manual tool-use loop.

## Goals / Non-Goals

**Goals:**
- Free-form Q&A grounded entirely in engine/grounding tool output — no fabricated numbers.
- A small, well-described tool surface the model uses to fetch exactly the facts it needs.
- Streaming answers for a responsive chat UI.
- Honest handling of certainty vs. probability and of out-of-scope questions.
- API key server-side only.

**Non-Goals:**
- No Managed Agents / hosted container — our tools are pure local functions, so this is the Claude API + tool-use tier.
- No knockout-bracket prediction, no fantasy/team-auth features.
- No UI (a later change owns the chat endpoint + frontend); this change exposes a callable runner.
- No fine-tuning or model selection logic — `claude-sonnet-4-6` fixed.

## Decisions

- **Tier: Claude API + tool use, not Managed Agents.** Per the decision tree, Managed Agents is for server-hosted stateful agents with a tool-execution container. Our tools are synchronous pure functions over a snapshot we already hold in-process — no workspace, no bash, no files — so a plain `messages` tool-use loop is the right, simplest tier. Alternative: Managed Agents — rejected as unnecessary infrastructure.
- **Facts via tools, not context dump.** Rather than stuffing all 48 teams' situations into the prompt, the model calls tools (`resolveTeam`, `getTeamSituation`, `getGroupSituation`, `getAdvancementProbabilities`) to pull only what a question needs. Keeps context small, caches the frozen system prompt, and makes grounding auditable. Alternative: prebuild full context — rejected, large and wasteful per question.
- **Grounding layer backs every tool.** Tool handlers call `buildTeamSituation` / `buildGroupSituation` / `advancementProbabilities`, returning structured JSON. The model phrases; it never computes. This is the core anti-hallucination guarantee.
- **Adaptive thinking + streaming.** `thinking: {type: "adaptive"}` lets the model reason over multi-team scenarios; streaming (`messages.stream` / `.finalMessage()`) avoids timeouts and feeds the chat UI. Effort default left at the SDK default (high) initially; tune later.
- **Snapshot freshness.** The runner takes (or loads) a `TournamentSnapshot` and threads the same snapshot through all tool calls in a turn, so every fact in one answer is internally consistent. Advancement probabilities are computed once per turn on demand (seeded) and reused.
- **Frozen system prompt for caching + persona.** A stable system prompt carries the Scout persona and the rules (ground claims, distinguish certainty from probability, decline the unanswerable). Volatile context (current date/round) goes after the cache breakpoint or into a tool, not interpolated into the system prompt.
- **Deterministic fallback when keyless.** When no API key (and no injected client) is available, the runner skips the model entirely and answers from the grounding layer: it reuses the same team/group **name resolver** the tools use to find what the question is about, then returns `buildTeamSituation`/`buildGroupSituation` narration. This reuses the resolver and grounding already built, makes the app useful with zero setup, and is fully deterministic/testable. The answer is tagged with its source (`llm` vs `deterministic`). Alternative: error without a key — rejected; the grounded stats are valuable on their own.
- **Module layout:** `lib/scout/tools.ts` (resolver + definitions + handlers), `lib/scout/prompt.ts` (system prompt), `lib/scout/scout.ts` (conversation runner + streaming + fallback), `lib/scout/index.ts`.

## Risks / Trade-offs

- **Hallucinated numbers** → the model is given no raw figures to compute from; all qualification/probability facts come from tool output, and the system prompt forbids inventing them. Tested via tool-grounding assertions.
- **Model answers out-of-scope or predicts knockouts** → system prompt + a "no tool can answer this" path; spec scenario requires declining rather than guessing.
- **API key leakage** → key read from server env only; never imported into client modules; spec'd and reviewed.
- **Latency from tool round-trips + thinking** → small tool set, stream the final answer, compute Monte Carlo once per turn; acceptable for a chat interaction.
- **Non-determinism in tests** → unit-test tool handlers deterministically (pure, seeded); for the conversation loop, test the loop mechanics with a stubbed/mocked Anthropic client rather than asserting model prose, plus an optional live smoke test gated on an API key.

## Migration Plan

Greenfield; depends on `scenario-grounding` and the engine/data layers. Add `@anthropic-ai/sdk`. Land tools + prompt + runner. Tests: deterministic tool-handler tests + a mocked-client loop test; live smoke test skipped when `ANTHROPIC_API_KEY` is unset. The chat HTTP endpoint and UI are a separate, later change.

## Open Questions

- Exact tool set granularity (one `getSituation` vs. several) — start with the four above; consolidate if the model over-calls.
- Whether to expose a "compare two teams" or "what should I watch tonight" tool now or let the model compose from per-team calls — start composed, add if needed.
- Effort level tuning (`high` vs `medium`) for latency/cost — defer to implementation measurement.
