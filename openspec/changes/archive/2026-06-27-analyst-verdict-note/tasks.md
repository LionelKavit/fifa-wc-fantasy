## 1. Shared template

- [x] 1.1 Create a pure `lib/predictor/verdictText.ts` exporting a `VerdictFacts` type (`winProbability`, `chalkWinProbability`, `expectedFinish`, `poolSize`, `pointsRange`) and `templateVerdict(facts): string` — the wording currently in `BracketVerdict.tsx#verdictSentence`.
- [x] 1.2 Update `app/components/BracketVerdict.tsx` to import `templateVerdict` (remove the local `verdictSentence`), keeping the immediate render identical.

## 2. Analyst note generator

- [x] 2.1 Add `lib/scout/verdict.ts#verdictNote(facts, opts?) → { text, source: "llm" | "template" }`: with a key/client, one buffered `messages.create` (no tools) using a small frozen system prompt (Analyst persona + grounding + "one short plain-text sentence, only these numbers, no preamble"); facts in the user message. Without a key or on error, return `{ text: templateVerdict(facts), source: "template" }`. Reuse the `scout.ts` client construction (extended-cache-ttl header) and a `cache_control` system block. Accept an injectable client/apiKey for tests.
- [x] 2.2 Strip any stray markdown/whitespace from the model text so it is one clean plain-text sentence.

## 3. API

- [x] 3.1 Add `app/api/predictor/verdict-note/route.ts` (`POST`, nodejs, force-dynamic): validate the facts (finite numbers; `pointsRange` shape; `poolSize ≥ 1`), call `verdictNote`, return `{ text, source }`; client-error on malformed input. Key read server-side only.

## 4. Non-blocking UI swap

- [x] 4.1 In `BracketVerdict.tsx`, keep rendering `templateVerdict(facts)` as soon as the pool-finish numbers arrive.
- [x] 4.2 Add a separate effect (debounced, keyed to the current facts, with a stale-response/seq guard) that POSTs the facts to `/api/predictor/verdict-note`; on success swap the sentence to the Analyst text; on failure/timeout leave the template.
- [x] 4.3 Show a small source tag by the sentence — "Analyst" when LLM-written, a quiet auto/template tag otherwise — reusing the chat's tag idiom.

## 5. Tests

- [x] 5.1 `templateVerdict` is pure/deterministic and reflects win-prob bucket + comparison to chalk (move/extend the existing template expectations).
- [x] 5.2 `verdictNote` returns the template with `source: "template"` when no key is configured; with an injected fake client it returns the model text with `source: "llm"` and strips markdown.
- [x] 5.3 The endpoint returns `{ text, source }` for valid facts (template path, keyless) and a client error for malformed facts.

## 6. Verify

- [x] 6.1 Verify in preview (keyless): the verdict card shows the template sentence with the auto/template tag and the numbers are never delayed. With an API key (manual): the sentence becomes an Analyst-voiced, grounded one-liner tagged "Analyst", swapped in after the numbers; a forced failure leaves the template.

## 7. Spec sync

- [x] 7.1 Confirm the implementation matches every scenario in the modified `specs/bracket-verdict-card/spec.md`; keep code and spec in sync.
