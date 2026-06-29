## Context

`buildBracket` already resolves R32 slots from real results (finalized groups → winner/runner-up; declared R32 fixtures → grounded third-placed) and falls back to the Annex C self-allocation when all groups are final. But mid-group-stage, most slots are placeholders, so a fan can't fill or simulate a complete bracket. The Monte Carlo (`simulate`) already produces a full group ordering every trial; we just don't tally finishing positions. This change surfaces those and uses them to project the most-likely R32 field as an explicit fallback.

## Goals / Non-Goals

**Goals:**
- Per-team P(finish 1st/2nd/3rd) from the existing simulation.
- A projected R32 fill (most-likely winner/runner-up per group + projected best-8 thirds via Annex C), flagged projected.
- Real resolution always wins; projection is opt-in and only fills gaps.

**Non-Goals:**
- Changing existing advancement-probability outputs or the dashboard/Scout.
- Predicting knockout results (that's the odds/predictor layer); this only fills the *roster*.
- A new simulation pass — reuse the existing trial loop.

## Decisions

**1. Tally finishing positions in the existing trial loop.**
Each trial already computes `rows` per group (ordered standings). Increment per-team counters for rank 1/2/3. `advancementProbabilities` exposes them as probabilities. Cheap, additive, no new simulation. Settled groups report the actual positions as certainties (consistent with how clinched/eliminated are pinned).

**2. Coherent per-group projection via greedy assignment.**
A team can't fill two positions, so we don't just take argmax independently. For each group, assign positions greedily: winner = highest P(1st); runner-up = highest P(2nd) among the rest; third = highest P(3rd) among the rest. This yields a distinct team per position and is deterministic. (Equivalent to the modal ordering in the common case.)

**3. Projected thirds ranked, then allocated via Annex C.**
Take each group's projected 3rd-placed team, rank the 12 by their likelihood of being a qualifying best-8 third (e.g. P(advance) among thirds, or P(3rd)×strength proxy), take the top 8, and run the existing `allocateThirds` over their group letters. Reuses the Annex C machinery already built and tested.

**4. `buildBracket` gains an optional projection input; slots gain a `projected` flag.**
Signature extended with an optional projection (the finishing-position-derived winner/runner-up/thirds). Resolution order per slot: real fixture/grounded → finalized-group standings → Annex C self-alloc (all groups final) → **projection (flagged projected)** → placeholder. The flag lets the UI badge projected teams. With no projection passed, behaviour is exactly as today.

**5. The predictor data layer computes and injects the projection.**
`getBracketData` builds the projection from `advancementProbabilities` and passes it to `buildBracket`, so the predictor shows a complete, clearly-labelled fallback bracket; the dashboard (which doesn't pass a projection) is unaffected.

## Risks / Trade-offs

- **Projection churn as group results change** → expected and fine; it's a live fallback. The `projected` flag + UI badge set the right expectation, and real teams replace projections automatically.
- **Greedy assignment edge cases (near-tie positions)** → deterministic tie-break (e.g. by team id) keeps it reproducible; the projection is a best-guess, not a guarantee.
- **Projected thirds ranking heuristic** → pin the exact ranking metric in implementation; the spec only requires "projected best-eight, allocated via Annex C within candidate groups."
- **Stored predictions keyed to R32 identity** → projected R32 ids will shift as groups resolve; the predictor's existing key-on-R32-identity logic already discards a stale stored bracket, which is acceptable for a pre-lock fallback.

## Open Questions

- Exact metric for ranking the 12 projected thirds down to 8 — pinned in implementation; spec-neutral.
- Whether to also show per-slot projection confidence (e.g. "Winner Group F: BRA 62%") in the UI — nice-to-have, deferred; the data (finishing-position probability) is available if wanted.
