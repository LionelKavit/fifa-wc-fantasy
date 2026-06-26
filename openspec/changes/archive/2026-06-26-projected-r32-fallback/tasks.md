## 1. Finishing-position probabilities

- [x] 1.1 In `simulate` (`lib/engine/montecarlo.ts`), tally per-team finishing positions (rank 1/2/3) from each trial's group `rows`; add the counts to `SimulationResult`.
- [x] 1.2 Expose per-team P(finish 1st/2nd/3rd) via `advancementProbabilities` (`lib/engine/probability.ts`); pin actual positions as certainties when a group is final.
- [x] 1.3 Tests: probabilities in [0,1]; per-position probabilities sum to 1 across a group; final group reports certainties.

## 2. Projected R32 fill

- [x] 2.1 Build a per-group coherent projection (greedy: winner = max P1, runner-up = max P2 of the rest, third = max P3 of the rest).
- [x] 2.2 Rank the 12 projected thirds, take the best 8, and allocate them to slots via `allocateThirds`.
- [x] 2.3 Extend `buildBracket` with an optional projection input and a `projected` flag on `BracketSlot`; resolution order: real/grounded → finalized-group → Annex C self-alloc → projection (flagged) → placeholder.
- [x] 2.4 Tests: undetermined slots filled with projected teams + flagged; coherent (distinct team per position); real results not overridden; projection opt-in (off → placeholders as before).

## 3. Predictor wiring (bracket-predictor-ui, in-flight)

- [x] 3.1 In `getBracketData`, compute the projection from `advancementProbabilities` and pass it to `buildBracket`; include the `projected` flag in the serialized bracket.
- [x] 3.2 UI: badge projected slots as "projected — not yet official"; make clear the roster is a fallback until the real R32 is set.
- [x] 3.3 Verify in the running app (preview): mid-group-stage shows a complete, projected R32 that a fan can fill and simulate; finalized slots show real teams unflagged.

## 4. Spec sync

- [x] 4.1 Confirm implementation matches every scenario in `specs/advancement-probability/spec.md` and `specs/knockout-bracket/spec.md`; update the predictor UI spec for the projected badge; keep code and specs in sync.
