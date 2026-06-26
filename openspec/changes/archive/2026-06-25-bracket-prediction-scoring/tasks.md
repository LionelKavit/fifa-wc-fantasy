## 1. Types and weights

- [x] 1.1 Add scoring types to `lib/engine/types.ts`: `PickStatus` (`"pending" | "correct" | "wrong" | "busted"`), `PickScore` (matchId, stage, pickedTeamId, status, pointsEarned), and `PredictionScore` (per-pick array, current total, maxAchievable).
- [x] 1.2 Define a default `StageWeights` record keyed by `KnockoutStage` with strictly increasing values (e.g. R32:1, R16:2, QF:4, SF:8, F:16); allow override.

## 2. Scoring module

- [x] 2.1 Create `lib/engine/predictionScore.ts` exporting `scorePrediction(prediction, snapshot, opts?)`; export from `lib/engine/index.ts`.
- [x] 2.2 Build the actual bracket via `buildBracket(snapshot)` and index, per match, the real winner and the set of teams that really reached it.
- [x] 2.3 Classify each pick: `busted` if the picked team isn't an actual participant (and is eliminated); else `correct`/`wrong` by the real winner; else `pending`.
- [x] 2.4 Sum points (weights of `correct` picks) for the current total, and current + `pending` weights for the maximum achievable.

## 3. Tests (Vitest)

- [x] 3.1 Status: correct, wrong (reached but lost), busted (eliminated earlier / never reached), pending (undecided + alive).
- [x] 3.2 Points: correct picks earn their round weight; wrong/busted/pending earn zero; later-round weights strictly exceed earlier ones.
- [x] 3.3 Totals: maximum = current + pending weights (excluding wrong/busted); maximum ≥ current; maximum equals current when nothing is pending.
- [x] 3.4 Purity: deterministic, no I/O, repeatable.

## 4. Spec sync

- [x] 4.1 Confirm implementation matches every scenario in `specs/bracket-prediction-scoring/spec.md`; update the spec if behavior is intentionally refined during implementation.
