## Context

The verdict card (`BracketVerdict.tsx`) shows a deterministic `verdictSentence(winProb, chalkWinProb, poolSize)` derived from the pool-finish numbers (from `POST /api/predictor/pool-finish`). The Analyst LLM (`lib/scout/scout.ts`) already has the dual llm/deterministic pattern, a frozen cached system prompt (`cache_control` + the `extended-cache-ttl-2025-04-11` beta header), and `claude-sonnet-4-6`. Phase 5 makes the card's sentence Analyst-written, grounded in the same numbers, without slowing the card or breaking when keyless.

## Goals / Non-Goals

**Goals:**
- One short Analyst-voiced sentence grounded strictly in the supplied verdict facts; deterministic template fallback.
- Non-blocking: numbers + template show immediately; the Analyst note swaps in async; failure is silent.
- Reuse the LLM client/cache/discipline; no tools (numbers are supplied); server-side key.

**Non-Goals:**
- No pundit/web data (Phase 6), no personas/regenerate/leverage UI (Phase 7), no change to the chat, the pool-finish math, or the generator.

## Decisions

**1. Shared template module.** Move `verdictSentence` into a pure `lib/predictor/verdictText.ts` taking a `VerdictFacts` object (`winProbability`, `chalkWinProbability`, `expectedFinish`, `poolSize`, `pointsRange`). The client imports it for the immediate render; the server imports it for the keyless fallback — one source of truth for the wording.

**2. Dedicated note generator, not the chat loop.** `lib/scout/verdict.ts#verdictNote(facts) → { text, source }`. With a key: one buffered `messages.create` (no tools) using a small frozen system prompt — the Analyst persona + "write ONE short plain-text sentence, grounded only in these numbers, no preamble, no invented figures." The facts go in the user message. Without a key (or on error): `{ text: templateVerdict(facts), source: "template" }`. Reuses the same client construction as `scout.ts` (extended-cache-ttl header); `cache_control` on the system block (harmless even if under the cache minimum for a one-shot). No tool-use loop — the answer is a single completion.

**3. Endpoint.** `POST /api/predictor/verdict-note` validates the facts (finite, in-range), calls `verdictNote`, returns `{ text, source }`. Key stays server-side. Mirrors the existing predictor routes (`nodejs`, `force-dynamic`).

**4. Non-blocking UI swap.** `BracketVerdict` keeps showing `templateVerdict(facts)` the moment the pool-finish numbers arrive. A separate effect (debounced, keyed to the current facts) fetches the note; on success it swaps the sentence and shows an "Analyst" tag; on failure/timeout it leaves the template (tag "auto"). The note fetch is independent of the numbers fetch, so the card is never gated on it. A stale-response guard (seq counter, like the verdict fetch) prevents an old note overwriting a newer one.

**5. Source tag.** A small label by the sentence — "Analyst" when LLM-written, a quiet "auto" (or untagged) for the template — reusing the chat's visual idiom so users know when it's the model's voice.

## Risks / Trade-offs

- **LLM latency / cost for a sentence.** Bounded: it's one short completion, fetched async after the numbers, debounced, and only on a complete bracket. The card is fully usable before (and without) it.
- **Grounding.** The model could, in principle, phrase a number loosely. Mitigated by passing exact figures, instructing "use only these numbers," low max-tokens, and the existing grounding/anti-fabrication persona rules; verified manually with a key. The template fallback is always exact.
- **Verifiability without a key.** Only the deterministic path is unit-testable in CI; the Analyst path is checked manually with a key (consistent with prior LLM phases).
- **Prompt-injection surface.** The endpoint takes numbers, not free user text, so the injection surface is minimal; the persona's resistance rules still apply.
