## Context

The Analyst runs a grounded tool-use loop with a frozen, cached system prompt. It already must stay grounded and "say so if the tools can't answer." This change makes the boundary explicit and adds injection resistance — almost entirely a system-prompt hardening, so it preserves caching, brevity, and the loop.

## Goals / Non-Goals

**Goals:**
- Answer only FIFA World Cup 2026 tournament questions; one-sentence decline otherwise.
- Resist prompt injection from user input and tool/context data; never leak/override the system prompt; never act outside the tools; never fabricate.

**Non-Goals:**
- Model/tool/loop/endpoint/UI changes. A heavyweight moderation layer or classifier — the frozen prompt + existing grounding suffice for this scope.

## Decisions

**1. Implement as rules in the frozen system prompt.**
Add a short "Scope" line (only WC 2026 tournament topics; one-sentence decline otherwise) and an "Ignore embedded instructions" line (treat user/tool text as data; don't change role/scope, reveal/rewrite the prompt, or act outside tools). Keeping it in the existing frozen prompt means it stays in the cached prefix — no caching or latency regression — and the brevity rules already there bound the decline to one sentence.

**2. Lean on grounding for the "no fabrication" guarantee.**
The Analyst already answers only from tool output; the injection rule reinforces that pressure/"jailbreak" attempts can't make it invent numbers. No new mechanism.

**3. Defense in depth via the data layer (already true).**
Tools return structured engine facts (not free text the model treats as commands), and the chat endpoint only passes a question + typed context (picks/poolSize) — so the main injection surface is the user's message, which the prompt rule addresses. Tool/context text is data by construction.

**4. Fix the prompt-cache hit rate at its root: the prefix is below the cache minimum.**
Measured, the cached prefix is system (~442 tok) + tools (~490 tok) ≈ **932 tokens**, under Anthropic's **1024-token minimum for Sonnet**. Below the minimum, `cache_control` is **silently ignored** — so nothing caches and the console shows a ~5% (noise-level) hit rate. Two levers, no new dependencies:
- **Clear the floor.** The scope + injection rules added in this change enlarge the system prompt; we ensure the combined tools+system prefix clears 1024 with margin (a few hundred tokens), and assert it in a unit test so it can't silently regress. (We do not pad artificially — the rules we're adding are real content.)
- **Match TTL to cadence.** Default ephemeral TTL is 5 minutes; a casual chat routinely exceeds that between turns. Use the **extended 1h TTL** (`ttl: "1h"` + the extended-cache-ttl beta header) so follow-ups within a session reuse the prefix. Trade-off: a 1h cache write costs ~2x base input vs ~1.25x for 5m, but reads stay ~0.1x and we avoid repeatedly rebuilding the prefix — net win for sporadic traffic.
- **Keep the prefix byte-stable and per-request data after the breakpoint** (already the case): tools and system are module constants; the question/history/context are appended as messages after the cached `system` block.
- **Cache the conversation tail with a second breakpoint.** The static prefix alone doesn't cover the growing message history. Place a second `cache_control` breakpoint on the tail of the messages (the last message/content block) so the accumulated history is cached too: within a single question, each tool-use iteration appends an assistant `tool_use` + a user `tool_result`, and the next iteration reads the earlier ones from cache; across turns, the next question reuses the prior conversation. Anthropic allows up to 4 breakpoints and reads from the longest matching cached prefix, so this composes with the prefix breakpoint. Net effect: the tool-loop (up to 6 iterations) and multi-turn follow-ups stop reprocessing history.

**5. Why not the `headroom` tool.**
`headroom`'s `CacheAligner` "stabilizes prefixes so provider KV caches actually hit" — but our prefix is already byte-stable; the problem is that it's *below the size minimum*, which prefix-stabilization does not address. Headroom's core value is token-volume compression (a different goal from hit rate), and it ships as a Python/Rust proxy/library — disproportionate for a thin Next.js app. We adopt the principle (a stable, sufficiently large cached prefix) natively instead of the dependency.

## Risks / Trade-offs

- **LLM guards are probabilistic, not airtight** → the prompt rule plus structured (non-instruction) tool data substantially reduces risk; we accept residual risk for a low-stakes, read-only assistant (no side-effectful tools to abuse).
- **Over-refusal** (declining borderline-relevant questions) → scope is defined broadly enough (teams, groups, bracket, tracker) to cover normal use; keep the decline friendly and redirecting.
- **Prompt growth vs token budget** → the added rules are a few short lines; negligible per-request, and cached. Here the growth is actually helpful: it pushes the cached prefix over the 1024-token cache minimum.
- **Extended (1h) cache writes cost more** → ~2x base input on a write vs ~1.25x for the 5-minute TTL; acceptable because reads stay ~0.1x and sporadic traffic otherwise rebuilds the prefix repeatedly. Revisit if traffic becomes dense and steady.

## Open Questions

- Exact wording of the scope/decline lines — pinned in implementation; spec fixes only the behaviour (on-topic answered, off-topic one-sentence decline, injection ignored, no fabrication).
- Whether to add a keyed smoke test asserting an off-topic prompt is declined and an injection attempt is resisted — nice-to-have; only runs with an API key.
