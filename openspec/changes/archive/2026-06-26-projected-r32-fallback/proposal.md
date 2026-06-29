## Why

Before the group stage finishes (and before FIFA declares the Round-of-32 fixtures), the predictor's R32 is mostly placeholders ("Winner Group F", "3rd C/E/F/H"), so a fan can't fill a *complete* bracket or simulate a full score yet. The model already simulates how the groups will finish — so we can project the most-likely R32 field and use it to fill those placeholders as a fallback roster, letting fans play and simulate immediately. It's explicitly marked as projected and is replaced automatically once the real teams are known.

## What Changes

- Add **per-group finishing-position probabilities** (probability each team finishes 1st, 2nd, or 3rd) computed from the existing Monte Carlo — the same simulation already produces each trial's group standings.
- Add a **projected R32 fill**: when an R32 slot's real occupant is not yet known, fill it with the model's most-likely occupant — the projected group winner / runner-up by finishing position, and the projected best-8 third-placed teams allocated to slots via the existing Annex C allocation. Each projected slot is **flagged as projected** (not official).
- Preserve precedence: a slot resolved from **real results** (a finalized group or a declared R32 fixture) always wins over a projection; projections only fill the gaps.
- Surface the fallback in the predictor UI as a clear **"projected — not yet official"** state so fans know these teams may change.

## Capabilities

### New Capabilities
<!-- None; extends existing capabilities. -->

### Modified Capabilities
- `advancement-probability`: add per-group finishing-position probabilities (P finish 1st / 2nd / 3rd) derived from the Monte Carlo.
- `knockout-bracket`: add a projected R32 fill that populates undetermined R32 slots with the model's most-likely occupants (flagged projected), with real-result resolution taking precedence.

## Impact

- **Engine**: extend the Monte Carlo accumulators (`lib/engine/montecarlo.ts`) to tally per-team finishing positions; expose them via `advancementProbabilities` (`lib/engine/probability.ts`). Add a projected-fill path to `buildBracket` (`lib/engine/bracket.ts`) using those projections + the existing `allocateThirds`. `BracketSlot` gains a `projected` flag.
- **Predictor data/UI** (`bracket-predictor-ui`, in-flight): pass the projection into the bracket and badge projected slots; updated as part of implementing this change.
- **Depends on** `advancement-probability` (the group simulation), `knockout-bracket-structure` (slots/feeders + candidate sets) and `knockout-advancement-odds` (the Annex C allocation).
- **No** change to the dashboard, the Scout chat, or existing advancement-probability outputs (the finishing-position data is additive). Fully backwards-compatible.
