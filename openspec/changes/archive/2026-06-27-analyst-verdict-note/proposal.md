## Why

The verdict card answers "will this win my pool?" with grounded numbers and a one-line read — but that read is a fixed template. The product's value is the *expert friend in your corner*; the sentence should sound like the Analyst, not a mail-merge. Phase 5 makes the verdict sentence Analyst-written — grounded strictly in the same numbers — while keeping the template as a graceful fallback so the card never blocks, slows, or breaks without a key.

## What Changes

- The verdict card's plain-language sentence becomes **Analyst-written** when an Anthropic key is configured: one short, plain-text sentence in the Analyst's voice, **grounded strictly in the supplied numbers** (win probability, you-vs-the-model/chalk win probability, projected finish, pool size, points range). No invented numbers, no preamble.
- **Graceful fallback**: with no key (or on failure) the card keeps the existing deterministic **template** sentence. The source is indicated (an "Analyst" vs. template tag), mirroring the chat's llm/deterministic dual-path.
- **Non-blocking**: the card shows the template sentence immediately (the numbers already arrived from the pool-finish call), then fetches the Analyst note asynchronously and swaps it in when ready. The note never delays the numbers; a failed/absent note simply leaves the template.
- **Shared template**: the current `verdictSentence` helper moves out of `BracketVerdict.tsx` into a pure shared module, so the client's immediate render and the server's deterministic fallback use the same text.
- **New endpoint** `POST /api/predictor/verdict-note`: accepts the verdict facts, returns `{ text, source }`. Server-side key handling; validates the facts; deterministic fallback when keyless.
- The note generation **reuses the LLM infrastructure and disciplines** (the `@anthropic-ai/sdk` client, the extended-cache-ttl header, a frozen/cached system prompt, brevity + grounding + plain text) but needs **no tools** — the numbers are supplied — so it is a single short completion, not the chat's tool-use loop.

## Capabilities

### New Capabilities
<!-- none — enhances the existing verdict card -->

### Modified Capabilities
- `bracket-verdict-card`: the plain-language verdict becomes Analyst-written (LLM) when available, grounded in the numbers, with the deterministic template as a non-blocking fallback; add the verdict-note endpoint and the async-swap / source-tag behavior.

## Impact

- **Shared** (new pure module, e.g. `lib/predictor/verdictText.ts`): the `verdictSentence` template moved here, imported by both the client and the server fallback.
- **LLM** (new `lib/scout/verdict.ts`): `verdictNote(facts)` → `{ text, source }` — Analyst voice via the existing client/cache pattern when keyed, else the shared template; a small frozen system prompt (persona + grounding + brevity, plain text).
- **API** (`app/api/predictor/verdict-note/route.ts`): POST facts → `{ text, source }`, server-side key, validated, keyless fallback.
- **UI** (`app/components/BracketVerdict.tsx`): render the template immediately, fetch the note async (debounced, keyed to the current facts), swap it in with a source tag; failure leaves the template; never blocks the numbers.
- **No** change to the pool-finish math, the generator, the chat, or any external data. LLM-path wording is verified manually with a key; the keyless fallback is unit-testable.
