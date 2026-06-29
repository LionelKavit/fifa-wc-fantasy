## Why

The engine can now build the knockout tree (`knockout-bracket`) and estimate who reaches the Round of 32 (`advancement-probability`), but it stops there. Fans want the headline number every bracket conversation revolves around — *"what are my team's chances of actually winning it?"* — and the per-round odds (reach R16 / QF / SF / Final / lift the trophy) that make the bracket feel alive. This change extends the existing Monte Carlo past the group stage and through the bracket to produce those deep-run probabilities. It also folds in the self-computed Annex C third-placed allocation deferred from `knockout-bracket-structure`, which the simulation needs because simulated snapshots carry no authoritative Round-of-32 assignment.

## What Changes

- Extend each Monte Carlo trial so that, after sampling all remaining group fixtures and resolving the 32 qualifiers, it **plays out the full bracket** (R32 → Final) by sampling each knockout match with the existing Poisson `OutcomeModel`.
- Introduce per-team **deep-run probabilities**: the probability of reaching each stage — R16, QF, SF, Final, and Champion — as the fraction of trials in which the team reaches that stage.
- Pin settled cases exactly: a team already eliminated from the Round of 32 has 0 for every stage; clinched/eliminated short-circuits stay consistent with `advancement-probability`.
- Expose **matchup-level conditional win probabilities** for prospective knockout pairings (the per-pairing data an upset radar later consumes), distinct from the per-team stage totals.
- Add a **self-computed third-placed allocation** to `knockout-bracket`: assign the eight best third-placed teams to their Round-of-32 slots from the combination of qualifying group letters, consistent with FIFA's Annex C — derived from FIFA's official per-slot candidate sets (encoded as data) via a deterministic perfect matching. This is required inside each trial, where there is no snapshot assignment to ground against.

This change is **engine + spec only**: no UI, no API, no persistence.

## Capabilities

### New Capabilities
- `knockout-probability`: per-team probability of reaching each knockout stage (R16/QF/SF/Final/Champion) by simulating the bracket, with settled-case short-circuits and matchup-level conditional win probabilities.

### Modified Capabilities
- `knockout-bracket`: add a self-computed Annex C third-placed allocation (qualifying group-letter combination → Round-of-32 slot) for snapshots without an authoritative assignment, complementing the existing snapshot-grounded resolution.

## Impact

- **Engine**: extends `lib/engine/montecarlo.ts` (per-trial bracket play-out) and adds a new probability surface (e.g. `lib/engine/knockoutProbability.ts`); adds an allocation table/module consumed by `lib/engine/bracket.ts`. Reuses `outcome.ts` (`OutcomeModel`), `thirdPlace.ts`, `rng.ts`, and `buildBracket`.
- **Depends on** `knockout-bracket-structure` (the tree, slots, feeders, candidate sets) and `advancement-probability` (the existing trial loop, seeding, and clinched/eliminated pinning). No requirement of `advancement-probability` changes — Round-of-32 advancement remains its boundary; this capability begins at the bracket.
- **Data**: the third-placed allocation is derived from FIFA's official per-slot candidate sets (cross-checked against published fixtures); a test validates a correct assignment for all 495 combinations. No unpublished table is transcribed.
- **No** API, UI, dependency, or breaking changes. Establishes the odds foundation later changes (share cards, predictor "you vs. the model", upset radar) build on.
