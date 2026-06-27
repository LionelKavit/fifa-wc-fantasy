## Context

Phase 1 (`bracket-scoring-scheme`) landed: `scorePrediction` grades a prediction against the **snapshot's real results** and computes per-pick `roundBase × multiplier`, where the multiplier comes from a supplied `matchupWinProb` callback. Phase 2 needs the *relative* answer — how a bracket places against a field — which requires scoring against **simulated** outcomes, not the real snapshot.

The existing `simulate` (`lib/engine/montecarlo.ts`) plays out full tournaments but (a) only returns aggregates and (b) re-samples the group stage each trial, so the R32 field shifts trial to trial. For pool finish, the user and all opponents filled **one** bracket over a **fixed** R32; we must hold that R32 fixed and vary only the knockout results. So Phase 2 brings its own knockout-only playout plus a score-against-outcome path, reusing the model, RNG, layout constants, and the Phase 1 multiplier/base.

This is the engine behind the Phase 3 verdict card ("will this win my pool?") and the objective the Phase 4 generator maximizes.

## Goals / Non-Goals

**Goals:**
- Pure, seeded evaluator: complete prediction + pool size → win probability, finish distribution, points-range percentiles, and (on demand) per-pick leverage.
- Chalk-biased, feasible opponent field with a tunable γ.
- Nested Monte Carlo with common random numbers; opponents resampled per trial.
- Explicit, tested tie handling and completeness policy.

**Non-Goals:**
- No verdict-card UI (Phase 3), no LLM verdict (Phase 5), no generator (Phase 4), no real public-pick data (Phase 6).
- No change to `simulate` or `scorePrediction` behavior — the new outcome-scoring path is additive.

## Decisions

**1. Knockout-only playout over a fixed R32.** Build the bracket once (real or projected R32, as the predictor shows). Per trial, play out R32 → Final using the outcome model: sample each matchup's scoreline (`samplePoisson`), resolve level matches with extra time then a 50/50 shootout — mirroring `montecarlo`'s `playKnockout`. Output is a `koWinner` map (match number → winning teamId): one concrete outcome. Holding the R32 fixed keeps every bracket scored on the same participant set, which `simulate`'s group re-sampling would not.

**2. Score against an outcome via fixed per-pick potential.** Precompute, per bracket, each pick's `potential = roundBase × multiplier` (multiplier from the Elo head-to-head of the two teams that pick's match pairs in *that* bracket — the same notion as Phase 1, fixed pre-tournament). A bracket's score in a trial = Σ potential over picks whose team equals `koWinner[match]`. Cheap per trial (a lookup + compare per match). Each opponent's potentials are precomputed once when its bracket is sampled.

**3. Opponent generation: chalk-biased, top-down, feasible.** Walk matches in bracket order. At each match the two participants are determined by the opponent's own feeder picks (R32 participants are the fixed field). Compute each participant's Elo head-to-head win prob `p`; form shares `q ∝ p^γ` (normalized over the two), and draw the winner from `q`. `γ` default ~1.5–2.0 (a named constant `PUBLIC_CHALK_GAMMA`, tunable); `γ > 1` pulls the public toward favorites. Result is always a feasible bracket.

**4. Nested MC + common random numbers.** Per trial: (a) play out one `koWinner`; (b) sample `K = poolSize − 1` opponent brackets; (c) score the user and all opponents against that same `koWinner`; (d) record the user's rank and win credit. Aggregate over `trials`. Resampling the field each trial integrates over opponent uncertainty (the unbiased estimate of P(win) the user asked for). Common random numbers (same outcome for everyone in a trial) is essential — without it, outcome noise swamps the comparison.

**5. Tie handling.** Win credit `= 1 / t` when the user ties `t − 1` opponents at the top with none above (fractional, statistically fair vs. counting a tie as a full win). Finish rank `= 1 + #{opponents strictly above}` (competition ranking). Both unit-tested at the boundaries.

**6. Per-pick leverage on demand.** For each pick, re-evaluate the user's win probability with that one pick flipped to the model's favorite for its match (field sampled the same way / shared seed), and report the delta. Cost ≈ 31× the headline run, so it is a separate call the caller invokes when needed, and can use fewer trials for a quick read.

**7. Completeness signal.** Use `completeness`/`derivePrediction` to detect a complete bracket. Incomplete → return a discriminated result (e.g. `{ complete: false }`) so callers render "finish your bracket" rather than a number.

**8. Determinism.** Seed a `mulberry32` RNG; thread it through outcome playout and opponent sampling so identical inputs reproduce exactly. The thin server helper in `lib/server/predictor.ts` supplies the Elo `matchupWinProb` (from `TEAM_ELO`) and a fixed default seed/trials.

## Risks / Trade-offs

- **Cost of resampling the field every trial.** `trials × poolSize × 31` sampling ops. Mitigation: opponent sampling is cheap arithmetic; precompute potentials per sampled bracket; expose `trials` and an effective field cap so large pools/sharp estimates stay interactive. Leverage uses reduced trials.
- **γ is a guess until real data.** The chalk bias is modeled, not measured; Phase 6 replaces it with real public-pick shares. `γ` is a single named constant to tune now and swap later.
- **Estimator variance.** Win probability for a near-average bracket needs enough trials to be stable; document a sensible default and that the verdict card should present a value, not false precision (it already pairs with a points range).
- **R32 fixed vs. live results.** Holding the R32 fixed matches how the bracket was filled; once real knockout results exist, the playout should respect decided matches (seed `koWinner` with real winners) — supported by passing decided results in, consistent with the predictor's "as it stands" survival.
