## 1. Closed-form head-to-head (engine)

- [x] 1.1 Add a pure `poissonHeadToHead(lambdaA, lambdaB, { goalCap? })` to `lib/engine` (e.g. in `outcome.ts` or a new `matchup.ts`): `Σ_{a>b} Pois(a;λ_A)Pois(b;λ_B) + ½·Σ_g Pois(g;λ_A)Pois(g;λ_B)` over goals `0..goalCap` (default ~12). Export from the engine index.
- [x] 1.2 Add a convenience that builds λ from team strengths + base rate + optional host boost (so callers pass strengths/ids, not raw λ), matching `createPoissonModel`'s rate formula (`baseRate × strength × homeBoost`).
- [x] 1.3 Unit test: result in [0,1]; `P(A,B)+P(B,A)=1`; stronger strength ⇒ >0.5; deterministic; and a property test that it agrees (within MC error) with `knockoutProbabilities` matchup odds for a sample pairing under the same model.

## 2. Repoint all head-to-heads onto the closed form

- [x] 2.1 In `lib/server/predictor.ts`, reimplement `eloHeadToHead(a, b)` as the Poisson closed form over `STRENGTHS` (neutral by default; host boost when a host is the home side via `hostTeamIds`). This automatically moves the card `serialize`, the upset multiplier in `evaluatePrediction`, the generator wiring (`generatePrediction`), and the pool-finish field onto it.
- [x] 2.2 Give the Scout context a `matchupWinProb(a, b)` built from the same closed form (server-side) and update `lib/scout/tools.ts#compare_teams` to use it instead of `ctx.ratings` + the logistic.
- [x] 2.3 Remove `eloWinExpectancy` from the engine surface (and any remaining imports) once no caller uses it; `eloStrengths` stays.

## 3. Re-calibrate logistic-tuned constants

- [x] 3.1 Re-pick the upset-multiplier cutoffs (`UPSET_MULTIPLIER_CUTOFFS`) for the flatter Poisson probabilities so the ×1/×2/×3 bands keep their intended meaning; keep them a named constant.
- [x] 3.2 Revisit the generator (favor/fade dominance, seeded variety still hold) and the opponent-field `PUBLIC_CHALK_GAMMA`; adjust only if behavior degraded. Confirm the generator still avoids far-fetched deep upsets.

## 4. Update tests

- [x] 4.1 Update expectations in the scoring, generator, pool-finish, scout `compare_teams`, and predictor tests that asserted logistic numbers, to the new Poisson head-to-head values (and any re-tuned cutoffs/γ).
- [x] 4.2 Update/keep the `consistent-matchup-odds` test so the card's R32 win % equals the Poisson head-to-head and equals what `compare_teams` reports (card == Analyst == sim).

## 5. Verify

- [x] 5.1 Verify in preview: an R32 card win % matches the Analyst for the same teams AND is close to the Monte-Carlo matchup odds; generated brackets still look realistic; the verdict and pool-finish behave sensibly. Confirm no console/server errors.

## 6. Spec sync

- [x] 6.1 Confirm the implementation matches every scenario in `specs/matchup-probability/spec.md`, the modified `specs/bracket-predictor-ui/spec.md`, and `specs/bracket-prediction-scoring/spec.md`; keep code and specs in sync.
