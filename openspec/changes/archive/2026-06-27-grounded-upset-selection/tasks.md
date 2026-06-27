## 1. Engine: grounded selection value

- [x] 1.1 In `lib/engine/bracketGenerator.ts`, add an optional `stageWinProb?: (teamId: number, stage: KnockoutStage) => number` to `GenerateBracketOptions` (the underdog's marginal probability of winning a match at that stage).
- [x] 1.2 Compute the selection value on the grounded path as `plausibility × differentiation`: `plausibility = stageWinProb(underdog, stage)`; `differentiation = 1 − fieldShare`, where `fieldShare = pU^γ / (pU^γ + (1−pU)^γ)` using `PUBLIC_CHALK_GAMMA` and the conditional `pU`. Keep `× SIGNAL_BIAS` (favor/fade) and the seeded jitter. Remove `DEFAULT_STAGE_WEIGHTS` and the multiplier from the value.
- [x] 1.3 Keep the multiplier strictly as a *gate*: only `upsetMultiplier(pU) ≥ 2` candidates are eligible. Drop the now-unused `DEFAULT_STAGE_WEIGHTS` import from the generator.
- [x] 1.4 Fallback: when `stageWinProb` is not supplied, retain the prior conditional weighting (`roundWeight × multiplier × pU`) so the pure engine still works without reach odds.

## 2. Server: supply reach probabilities

- [x] 2.1 In `lib/server/predictor.ts#generatePrediction`, obtain per-team reach odds from `knockoutProbabilities` (reuse what `getBracketData` computes for champion odds) and pass a `stageWinProb(teamId, stage)` that maps stage → reach field (R32→reachR16, R16→reachQF, QF→reachSF, SF→reachFinal, F→champion) into `generateBracket`.

## 3. Tests

- [x] 3.1 Grounded path (supply a synthetic `stageWinProb`): a far-fetched deep upset (underdog with ~0 reach prob at a deep stage) is NOT chosen over a realistically-reachable earlier upset for a one-slot budget.
- [x] 3.2 Grounded path: a deeper upset whose team has a meaningful reach prob remains an eligible/competitive candidate; and two similar-plausibility upsets in different rounds are not ranked by round weight (the deeper one isn't preferred merely for being deeper).
- [x] 3.3 Grounded path: coin-flip non-upsets (multiplier 1) are still never selected; determinism holds (same inputs + seed + `stageWinProb` → identical bracket); favor/fade still bias selection and seeded variety still differs across seeds.
- [x] 3.4 Confirm the existing generator tests (no `stageWinProb`) still pass on the fallback path; adjust only if a test conflicts with the fallback semantics.

## 4. Verify

- [x] 4.1 Verify in preview: generate a bracket and confirm it no longer sends a weak team to the final at safe/balanced; deeper upsets appear only for realistically-strong teams; bolder/larger pools still take more upsets; Regenerate still varies where there's choice.

## 5. Spec sync

- [x] 5.1 Confirm the implementation matches every scenario in `specs/bracket-generator/spec.md` (this change's modified + added requirements); keep code and spec in sync.
