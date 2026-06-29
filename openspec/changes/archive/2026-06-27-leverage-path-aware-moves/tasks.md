## 1. Composite move generation (engine)

- [x] 1.1 In `lib/engine/leverageGenerator.ts`, add a `pathMoves(...)` helper that, for each plausible dark-horse underdog `U` at a frontier match (real-underdog gate, not already selected), enumerates forward composite moves of depth `2..D`: the set of matches along `U`'s winning path for that many rounds. Cap the number of dark-horse `U` candidates (ranked by `stageWinProb(U)`) and the depth `D` (≤ rounds remaining). Represent a move as the set of match ids it would add to `selected`.
- [x] 1.2 Add a `maxPathDepth` option (default = full remaining depth, capped) and reuse `candidateCap` for the dark-horse candidate count; thread through `LeverageGenerateOptions`.
- [x] 1.3 Deduplicate depth-1 path moves against the existing single-flip candidates (a depth-1 path move is a single flip).

## 2. Integrate into the greedy loop

- [x] 2.1 Extend the per-step candidate set to be single-flip toggles (adds + reverts) **plus** composite path moves; apply each candidate by forming the trial `selected` set (toggle for single, union for composite) and `buildFromSelected` (top-down re-resolve for feasibility).
- [x] 2.2 Score every candidate move with `evalWin(..., searchTrials)` under the shared seed (common random numbers); commit the move with the largest Δ > epsilon; stop when none qualifies or `maxFlips` (now counting *moves*, not matches) is hit.
- [x] 2.3 Leave the final full-trials floor gate unchanged (re-evaluate chosen vs seed at `finalTrials`, return the better, seed wins ties).

## 3. Tests

- [x] 3.1 Engine (inject a synthetic evaluator keyed on a multi-round path): a case where advancing a dark horse through several rounds raises win probability but no single flip on the path does → the composite move is taken (the bracket backs that underdog across those rounds); a single-flip-only search on the same case would not.
- [x] 3.2 Engine: floor gate still holds for composites — a composite that scores higher at search trials but lower at full trials is reverted to the seed; determinism (same inputs+seed → identical bracket); bounded evaluations (assert a cap reflecting single + dark-horse × depth candidates per step).
- [x] 3.3 Engine: depth-1 path moves are not double-counted (no duplicate evaluations / identical behaviour to before on a single-flip-only case).

## 4. Verify

- [x] 4.1 Verified in preview (balanced, seed 1): "Optimize ≥ Build" holds everywhere — pool 4 leverage 35.92% vs heuristic 30.51% (+5.42), pool 20 ties 4.31% (no coordinated path beats the heuristic there), and pool 40 — which *tied* before this change — now leverage 4.81% vs heuristic 1.83% (+2.98, chalk 1.56%) via a composite dark-horse path. Heuristic generation deterministic; no console/server errors.

## 5. Spec sync

- [x] 5.1 Implementation matches the MODIFIED "Seeded win-probability maximization" and "Common random numbers and bounded cost" requirements and the ADDED "Path-aware composite upset moves" requirement in `specs/leverage-generation/spec.md`; code and specs in sync.
