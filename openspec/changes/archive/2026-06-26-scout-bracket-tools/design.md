## Context

The Scout (`lib/scout/`) runs a grounded tool-use loop (`claude-sonnet-4-6`, thinking off): it calls engine-backed tools for facts, then answers. Today its tools and prompt are group-stage-only. The product needs ONE Scout that also handles bracket advice and tracker questions — by adding tools and broadening the prompt, not by forking endpoints. This change adds the bracket knowledge sources and the conversational scope; the request-context plumbing + UI is the sibling `scout-context-ui` change.

## Goals / Non-Goals

**Goals:**
- A prediction-evaluation tool (status/odds/projected/survival/boldness/upset) over the user's picks.
- A team-strength / head-to-head tool (Elo strength, H2H win prob, deep-run odds).
- One prompt/persona spanning group-stage, bracket-advice, and tracker questions, grounded and brief.

**Non-Goals:**
- The strategy/swap *advice* tool — that's Phase 2 (`bracket-strategy-advice`).
- Request context plumbing, the predictor chat panel, or any endpoint change — `scout-context-ui`.
- Engine changes; tools wrap existing functions.

## Decisions

**1. Two read tools, both thin wrappers over existing engine functions.**
- `evaluatePrediction(picks)` → `scorePrediction` + `compareToModel` over the current snapshot, returning a compact summary (projected score, survival, boldness, upset bonus, and notable per-pick statuses/odds), with full per-pick detail on request to stay token-efficient.
- `teamStrength(teamA, teamB?)` → resolve via the existing name resolver; return Elo-derived strength + deep-run odds (from `knockoutProbabilities`), plus the head-to-head win probability for a pair (matchup-conditional, else normalized marginals). Reuses what the predictor already computes.

**2. The same `evaluatePrediction` serves both advisor and tracker.**
Advisor questions ("is this smart?") and tracker questions ("did it survive?") differ only in *which* picks are in context (a live draft vs. a saved bracket) and the user's intent — the tool and its output are identical. No separate tracker tool.

**3. Picks arrive as tool/turn context, not Scout state.**
The Scout stays stateless about brackets; the chat request carries the picks (plumbed by `scout-context-ui`). The tools read them from the call context; absent → a grounded "no bracket" result. Keeps the agent pure and avoids coupling to client storage.

**4. Broaden the prompt minimally; keep brevity and grounding.**
The frozen system prompt gains the three-domain scope and a note that bracket/tracker answers require provided picks. The "very brief, grounded, no Markdown" discipline stays — bracket advice may be a short concrete recommendation but not an essay (the longer strategic reasoning lands in Phase 2's tool output, summarized briefly).

**5. Token budget.**
`evaluatePrediction` returns a compact summary by default (headline numbers + only notable picks); detail on demand. Keeps the low-effort loop within budget even with a full 31-pick bracket.

## Risks / Trade-offs

- **Large evaluation payloads inflating tokens** → compact summary by default, full detail only when the question needs it.
- **Scope creep blurring the persona** → the prompt explicitly enumerates the three needs and defers to tool output; it still refuses out-of-domain questions.
- **Simulation cost when a tool runs** → reuse the cached snapshot-only baseline (as the predictor API does); only the per-prediction pass is per-call.
- **Stale picks vs current snapshot** → tools evaluate against the current snapshot, so "as it stands" facts stay correct even for an older saved bracket.

## Open Questions

- Exact compact-summary shape returned by `evaluatePrediction` — pinned in implementation against the token budget.
- Whether `teamStrength` should also surface a one-line "why" (e.g. recent form) — out of scope now; Elo + odds suffice.
