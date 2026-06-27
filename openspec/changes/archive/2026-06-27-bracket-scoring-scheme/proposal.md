## Why

The current scoring is two disconnected pieces: a round-weighted base score (`bracket-prediction-scoring`) and a *separate, additive* "upset bonus" bolted on in the model comparison. That split is hard to explain to a casual fan and gives no single, legible answer to "what is this pick worth?" Phase 1 of the AI bracket-builder roadmap needs **one** easily-understandable scoring preset where *deeper rounds and bolder correct calls both pay more* — and it is the foundation the later phases (pool-finish evaluator, generator, verdict card) all score against.

## What Changes

- Define a single default scoring preset: **base points double each round** (Round of 32 = 1, Round of 16 = 2, Quarterfinal = 4, Semifinal = 8, Final/champion = 16).
- Add an **upset multiplier that rides on the base of a correct pick**, by how big an underdog the picked team was in that matchup (the model's pre-match win probability for the two teams the prediction implies meet there): favorite/coin-flip (≥40%) = ×1, underdog (20–40%) = ×2, big underdog (<20%) = ×3. The band cutoffs are a single named, tunable constant.
- A pick's points are therefore `roundBase × upsetMultiplier`, awarded **only when the pick is `correct`**; the multiplier never creates points on a non-correct pick.
- **Per-pick transparency**: the scorer exposes, for each pick, the round base, the picked team's win probability, the multiplier applied, and the resulting points — so a UI can later show "Morocco — model gave them 30%, so ×2."
- **Maximum-achievable** totals account for the multiplier: a still-`pending` bold pick's potential includes its multiplier, consistent with the existing "of X max" display.
- Keep scoring a **pure, deterministic, parameterized** function (weights + cutoffs injectable) so a future "match your real pool's rules" preset can be added later; ship this preset as the default.
- The folded-in multiplier makes the legacy *additive* upset bonus in `prediction-model-comparison` redundant. To keep Phase 1 tight, that display-side reconciliation is **deferred to the Phase 3 verdict-card change** (which rebuilds the headline); this change does not alter the model-comparison spec.

## Capabilities

### New Capabilities
<!-- none — this extends existing scoring behavior -->

### Modified Capabilities
- `bracket-prediction-scoring`: round-weighted points gain an upset multiplier (correct picks score `roundBase × multiplier`); add the per-pick win-probability/multiplier transparency detail; maximum-achievable totals include the multiplier; scoring takes per-matchup win probabilities as a deterministic input while remaining pure.

## Impact

- **Engine** (`lib/engine/predictionScore.ts`, `lib/engine/types.ts`): the scoring function gains an upset multiplier and per-pick detail fields; the default weights become 1/2/4/8/16; a named cutoffs constant is added. Pure and unit-tested.
- **Server** (`lib/server/predictor.ts`): supply the per-matchup Elo win probabilities (already available via the model/ratings) into the scorer so the multiplier can be computed for the user's own matchups.
- **No UI change** in this phase. The old scorecard (`Headline`) is being shelved anyway; the new verdict card (Phase 3) consumes this scoring and reconciles the now-redundant additive bonus.
- Existing scoring tests update to the new default weights + multiplier; determinism preserved (same prediction + probabilities ⇒ same score).
