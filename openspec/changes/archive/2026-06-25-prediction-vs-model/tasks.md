## 1. Survival in the simulation

- [x] 1.1 Extended the knockout play-out in `lib/engine/montecarlo.ts` to accept an optional `prediction` and, per trial, record the deepest round through which all of the prediction's picks match the trial's outcomes; accumulate per-round survival counts (behind the option, default off).
- [x] 1.2 Added `survivalByStage` to `SimulationResult` without changing existing fields or the default path. Also added `ignoreCompletedKnockouts` so the baseline (pre-knockout) odds can re-simulate decided matches.

## 2. Comparison types

- [x] 2.1 Added comparison types to `lib/engine/types.ts`: `PickModelInfo` (matchId, stage, pickedTeamId, modelProb, status, contrarianPoints, agreesWithChalk) and `ModelComparison` (picks, per-round survival, headlineSurvival, contrarian totals, chalk bracket, divergence).

## 3. Comparison module

- [x] 3.1 Created `lib/engine/predictionVsModel.ts` exporting `compareToModel(snapshot, prediction, opts?)`; exported from `lib/engine/index.ts`.
- [x] 3.2 Per-pick model probability: each pick mapped to the picked team's marginal reach probability for the round it wins into, from the **baseline** simulation (pre-knockout, so decided upsets keep their long odds).
- [x] 3.3 Bracket survival per round, from the prediction-aware **live** simulation ("as it stands"); exposed `headlineSurvival` (survival through the Final).
- [x] 3.4 Contrarian scoring: reuse `scorePrediction` for status; for `correct` picks, points = stage weight × `contrarianFactor(modelProb)` (default `1/max(p,0.02)`, configurable, non-increasing); summed current + max.
- [x] 3.5 Chalk bracket + divergence: built the model's most-likely prediction (favourite per match via matchup conditional, else marginal), per-pick agreement, and aggregate divergence count/share.

## 4. Tests (Vitest)

- [x] 4.1 Per-pick model probability in [0,1]; a bold pick reads ≤ the chalk pick for the same match.
- [x] 4.2 Survival: non-increasing across rounds and in [0,1]; an all-underdog R32 survives ≤ chalk; an already-busted pick zeroes survival.
- [x] 4.3 Contrarian scoring: a correctly-called upset earns more than a correctly-called favourite in the same round; nothing earned with no correct picks; factor non-increasing in modelProb.
- [x] 4.4 Divergence: chalk bracket diverges zero; anti-chalk diverges more; per-pick agreement correct.
- [x] 4.5 Determinism: identical (prediction, snapshot, trials, seed) ⇒ identical comparison.

## 5. Spec sync

- [x] 5.1 Updated the spec so per-pick probability and contrarian scoring use the pre-knockout baseline, and survival is explicitly "as it stands"; recorded the two-simulation decision and resolved the open questions in design. Code and spec in sync.
