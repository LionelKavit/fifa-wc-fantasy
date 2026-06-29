## 1. Engine — head-to-head + boldness + upset bonus

- [x] 1.1 In `compareToModel`, compute per-pick head-to-head probability `h` (matchup-conditional for the predicted pairing; fall back to normalized marginals `mA/(mA+mB)`).
- [x] 1.2 Per-match boldness: `bold = h < 0.5`; replace the cascading divergence count/share with boldness count/share.
- [x] 1.3 Upset bonus: for `correct` picks, `bonus = base × max(0, 0.5/clamp(h) − 1)` (configurable floor/cap); zero for favourites and non-correct picks. Total = base + bonus. This is the "contrarian"/upset number.

## 2. Engine — expected points + projected score

- [x] 2.1 Per-pick expected points = `m × (base + bonus)` where `m` is the pick's probability of coming true (marginal reach for the round it wins into).
- [x] 2.2 Projected total score = sum of per-pick expected points; expose on the comparison result.
- [x] 2.3 Update `lib/engine/types.ts` (`PickModelInfo` gains `headToHead`, `bold`, `expectedPoints`; `ModelComparison` gains `projectedScore`, `boldnessCount`, `boldnessShare`; drop/redefine the old divergence fields).

## 3. Tests (Vitest)

- [x] 3.1 Boldness: an underdog pick is bold, a favourite pick is not — even when an earlier pick diverged; aggregate counts only underdogs.
- [x] 3.2 Upset bonus: correct underdog earns base + bonus; correct favourite earns base only; bigger upset pays ≥ (strictly > when h differs); non-correct earns zero.
- [x] 3.3 Expected points + projected score: projection equals the sum of per-pick expected points; deterministic for fixed seed; swapping a favourite for an underdog changes the expected-points trade-off.
- [x] 3.4 Head-to-head: in [0,1]; falls back to normalized marginals when the pairing is unobserved.

## 4. UI (bracket-predictor-ui, in-flight)

- [x] 4.1 Surface **Projected Score** as a headline (alongside survival); show per-pick expected points.
- [x] 4.2 Replace the divergence stat with **boldness**; mark bold/upset picks inline; show the upset bonus in the score breakdown.
- [x] 4.3 Update the predictor evaluation payload/types and the predictor change's spec to match.
- [x] 4.4 Verify in the running app (preview): projected score updates as picks change; bold picks flagged; favourite-in-late-round not counted bold.

## 5. Spec sync

- [x] 5.1 Confirm implementation matches every scenario in `specs/prediction-model-comparison/spec.md`; update the predictor UI spec for the new headline/fields; keep code and specs in sync.
