## 1. Scoring types & constants

- [x] 1.1 In `lib/engine/types.ts`, extend `PickScore` with `winProb` (the picked team's matchup win probability, in [0,1]), `multiplier` (1 | 2 | 3), and `roundBase` (that round's base weight); `pointsEarned` becomes `roundBase × multiplier` for `correct` picks.
- [x] 1.2 Add a named, exported cutoffs constant (e.g. `UPSET_MULTIPLIER_CUTOFFS = { upper: 0.40, lower: 0.20 }`) and change `DEFAULT_STAGE_WEIGHTS` to `{ R32: 1, R16: 2, QF: 4, SF: 8, F: 16 }`.

## 2. Multiplier-aware scoring

- [x] 2.1 Add a pure helper that maps a win probability to a multiplier using the cutoffs (≥upper → 1, [lower, upper) → 2, < lower → 3), with inclusive lower bounds; injectable cutoffs.
- [x] 2.2 In `lib/engine/predictionScore.ts`, give `scorePrediction` a per-matchup win-probability input (a lookup, or a model/ratings handle it derives head-to-head from) and `cutoffs` in `ScoreOptions`. For each pick, resolve the implied matchup participants (via the bracket / `predictedParticipants`), compute the picked team's win probability and multiplier, and set `winProb`/`multiplier`/`roundBase` on the `PickScore`.
- [x] 2.3 Award `roundBase × multiplier` to `current` only for `correct` picks; include `roundBase × multiplier` in `maxAchievable` for `correct` and `pending` picks; `wrong`/`busted` contribute zero to both.
- [x] 2.4 Keep the function pure and deterministic — no I/O; same prediction + snapshot + probabilities ⇒ identical output.

## 3. Server wiring

- [x] 3.1 In `lib/server/predictor.ts#evaluatePrediction`, supply the per-matchup Elo win probabilities (from `buildOutcomeModel` / `TEAM_ELO`) into `scorePrediction` so the multiplier is computed for the user's own matchups. No other server behavior changes; the legacy additive `upsetBonus` in `compareToModel` is left untouched (reconciled in Phase 3).

## 4. Tests

- [x] 4.1 Update existing `lib/engine/predictionScore.test.ts` expectations for the new default weights (1/2/4/8/16).
- [x] 4.2 Add tests: a correct chalk pick scores the bare base (×1); a correct underdog (e.g. 0.30) scores base×2; a correct big underdog (e.g. 0.10) scores base×3; band boundaries (exactly 0.40 → ×1, exactly 0.20 → ×2).
- [x] 4.3 Add tests: `maxAchievable` includes the multiplier on `pending` bold picks and converges to `current` once nothing is `pending`; `wrong`/`busted` never contribute.
- [x] 4.4 Add tests: per-pick detail (`winProb`, `multiplier`, `roundBase`, `pointsEarned`) is present for `correct` and non-`correct` picks; determinism (two runs, identical output); custom cutoffs change the bands.

## 5. Spec sync

- [x] 5.1 Confirm the implementation matches every scenario in `specs/bracket-prediction-scoring/spec.md`; keep code and spec in sync.
