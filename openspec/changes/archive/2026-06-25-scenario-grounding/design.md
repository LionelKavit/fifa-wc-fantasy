## Context

Layer 3 (the Scout agent) must never invent numbers. The cleanest guarantee is to assemble every fact it can cite into a tested, deterministic structure first, and let the LLM only *phrase* those facts. This grounding layer sits between the engine and the agent: it joins Layer 1 (verdicts) and Layer 2 (probabilities) into per-team/per-group situations and a plain-English narration. It is pure and needs no API key, so it is fully unit-testable and doubles as a non-LLM fallback explainer.

## Goals / Non-Goals

**Goals:**
- One structured `TeamSituation` / `GroupSituation` that unifies verdict + probability + decisive fixtures.
- Deterministic narration whose every claim maps to a structured field (no prose-only facts).
- Callers control simulation cost: probabilities included only when an advancement report is passed in.
- Pure, snapshot-driven, no LLM, no network.

**Non-Goals:**
- No LLM calls (that is the `scout-agent` change).
- No running of the Monte Carlo itself — it consumes an advancement report if given one.
- No UI rendering.
- No free-form question answering — only fixed per-team/per-group assembly.

## Decisions

- **Assemble, don't recompute.** Grounding consumes existing engine outputs (`computeQualificationVerdicts`, optionally `advancementProbabilities`) rather than re-deriving them, so there is a single source of truth and no risk of the narration disagreeing with the engine. Alternative: compute inside grounding — rejected, duplicates logic.
- **Probability is optional input, not a side effect.** The accessor takes an optional advancement report; if absent, the situation is verdict-only. This keeps grounding cheap by default and lets the caller decide when to pay for ~50k trials. Alternative: always simulate — rejected, forces cost on verdict-only callers.
- **Narration is templated and total.** A small set of deterministic templates keyed on `advancement` status + required-result shape. Every sentence is generated from a structured field, enforced by a test asserting no fact appears in prose without a backing field. Alternative: free-form strings — rejected, would let claims drift from data.
- **One situation type, two entry points.** `buildTeamSituation` and `buildGroupSituation` share the same `TeamSituation` shape; the group accessor is the per-team accessor mapped over the group plus the ordered table. Keeps the agent's tool surface small.
- **Module layout:** `lib/grounding/situation.ts` (assembly + types), `lib/grounding/narrate.ts` (templates), `lib/grounding/index.ts` (accessors).

## Risks / Trade-offs

- **Narration drifting from data** → enforce with a test that every narrated fact has a structured backing field; keep templates pure functions of the situation.
- **Stale probability vs. fresh verdict** → both derive from the same snapshot; the accessor takes the snapshot once and threads it to both, so they can't desync within a call.
- **Over-terse or misleading summaries on edge cases** (e.g. third-place race) → cover clinched / alive / thirdPlaceRace / eliminated each with explicit templates and tests.

## Migration Plan

Greenfield; depends on the three engine/data changes landing first. Land `lib/grounding/` with unit tests against the recorded snapshot and constructed situations. No runtime deps.

## Open Questions

- Exact sentence templates and tone — pin during implementation; keep them factual and short (the Scout adds personality, not these).
- Whether to include "who to root for" hints here or defer to the agent — defer; grounding states facts, the agent reasons about preferences.
