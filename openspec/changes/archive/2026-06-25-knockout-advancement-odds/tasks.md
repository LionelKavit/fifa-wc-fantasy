## 1. Annex C allocation

- [x] 1.1 Encode FIFA's official per-slot third-placed **candidate sets** as data (`THIRD_PLACE_SLOTS` in `lib/engine/bracketLayout.ts`), with source citation. (Decision: derive from candidate sets rather than transcribe the unpublished 495-row table.)
- [x] 1.2 Add `allocateThirds(qualifiedGroups): Map<matchNumber, GroupId>` (`lib/engine/thirdPlaceAllocation.ts`) — pure deterministic perfect matching over the candidate sets.
- [x] 1.3 Tests: a valid assignment is produced for all 495 combinations; forced placements (K→80, L→87) honored; deterministic regardless of input order; each slot filled exactly once within candidate sets.

## 2. Wire allocation into the bracket

- [x] 2.1 Extract the static R32/KO layout into `lib/engine/bracketLayout.ts` so `buildBracket` and the simulator share one source of truth.
- [x] 2.2 In `buildBracket`, use `allocateThirds` as a fallback to resolve third-placed slots when all groups are final but the snapshot carries no R32 assignment; grounded snapshot resolution keeps precedence.
- [x] 2.3 Tests: grounded assignment still wins when present; self-computed allocation fills third-placed slots once every group is final (and stays a placeholder when not all groups are final).

## 3. Per-trial bracket play-out

- [x] 3.1 Extend `simulate` (behind `playoutKnockout`) so each trial seeds the R32 from the trial's group winners/runners-up and `allocateThirds` over the trial's eight thirds.
- [x] 3.2 Play each knockout round R32→Final using the injectable `OutcomeModel`; resolve level matches via extra time then a 50/50 shootout on the trial's RNG; keep already-completed knockout results fixed.
- [x] 3.3 Accumulate per-team stage-reach counts (R16/QF/SF/Final/Champion) and per-pairing matchup counts; reuse buffers to avoid per-trial allocation.
- [x] 3.4 Extend `SimulationResult` with `stageReach` and `matchups` without changing existing fields; default path (`playoutKnockout` off) stays fast.

## 4. Deep-run probability surface

- [x] 4.1 Add `knockoutProbabilities(snapshot, opts)` (`lib/engine/knockoutProbability.ts`) returning per-team P(reach each stage) and matchup conditional win probabilities; export from `lib/engine/index.ts`.
- [x] 4.2 Pin settled cases: eliminated-from-R32 teams report 0 for all stages (via the deterministic verdict).

## 5. Tests (Vitest)

- [x] 5.1 Play-out invariants: completed knockout results are respected across all trials.
- [x] 5.2 Probability invariants: per-team stage probabilities monotonic and in [0,1]; champion probabilities sum to 1; eliminated teams all-zero.
- [x] 5.3 Matchup conditionals: realized pairings report two sides summing to 1 with positive meetings.
- [x] 5.4 Determinism: identical (snapshot, trials, seed) ⇒ identical odds and conditionals.

## 6. Spec sync

- [x] 6.1 Updated specs/design/proposal so the Annex C requirement reflects candidate-set-derived matching (not a transcribed table) and the two open questions are resolved as decisions. Code and specs in sync. Also corrected a Phase A candidate-set transcription bug (match 82 was missing group E).
