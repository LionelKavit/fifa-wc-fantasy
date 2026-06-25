## 1. Third-place ranking

- [x] 1.1 Implement pure `rankThirdPlaced(finalStandings)` selecting best 8 of 12 under FIFA tiebreakers (points → GD → goals → fair play → lots) in `lib/engine/thirdPlace.ts`
- [x] 1.2 Unit-test best-8 selection on constructed 12-team third-place sets, including point/GD/goals separations and a full-tie deterministic resolution

## 2. Outcome model & RNG

- [x] 2.1 Add a seedable PRNG helper for reproducibility
- [x] 2.2 Define an injectable per-fixture outcome model interface and ship the Poisson-goals baseline (independent Poisson per side, rate = team strength + home advantage; neutral default strengths)
- [x] 2.3 Unit-test the Poisson model: non-negative integer goals, seed-reproducible, neutral default strengths unbiased

## 3. Monte Carlo simulation

- [x] 3.1 Implement a trial: fix completed fixtures, sample every remaining group fixture, recompute all 12 group standings, run `rankThirdPlaced` in `lib/engine/montecarlo.ts`
- [x] 3.2 Aggregate per-team advancement frequency (top 2 OR best-8 third) across trials
- [x] 3.3 Accept seed + trial count; ensure same (seed, trials) reproduces identical aggregates
- [x] 3.4 Unit-test a trial yields complete standings + exactly 8 third-place qualifiers; completed fixtures unchanged

## 4. Advancement probability

- [x] 4.1 Implement `advancementProbabilities(snapshot, opts)` returning per-team probability in [0,1] in `lib/engine/probability.ts`
- [x] 4.2 Pin deterministic cases: clinched → 1.0, eliminated → 0.0 (from the deterministic layer), bypassing trial frequency
- [x] 4.3 Implement conditional-on-own-result split (win/draw/loss) via branch filtering/stratification
- [x] 4.4 Unit-test: clinched=1.0, eliminated=0.0, contended in (0,1); conditional branches estimated only from consistent trials

## 5. Performance & API

- [x] 5.1 Verify default trial count completes within the interactive runtime budget
- [x] 5.2 Export probability + third-place APIs from `lib/engine/index.ts` for the LLM/UI layers
- [x] 5.3 Add structural-property tests (probabilities bounded; clinched/eliminated honored; reproducible under fixed seed)
