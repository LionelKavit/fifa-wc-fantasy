## 1. Outcome playout (fixed R32)

- [x] 1.1 In a new `lib/engine/poolFinish.ts`, add a seeded knockout-only playout: given the built bracket (fixed R32), the outcome model, and an RNG, play out R32 → Final (sample scorelines via `samplePoisson`, resolve level matches with extra time then a 50/50 shootout, mirroring `montecarlo`'s `playKnockout`) and return a `koWinner` map (match number → winning teamId).
- [x] 1.2 Allow seeding the playout with already-decided real knockout results so the estimate respects "as it stands" once games are played.

## 2. Score against an outcome

- [x] 2.1 Precompute, per bracket, each pick's `potential = roundBase × multiplier` using the Phase 1 base weights and `upsetMultiplier` over the Elo head-to-head of the two teams that pick's match pairs (via `predictedParticipants`).
- [x] 2.2 Add `scoreAgainstOutcome(potentials, koWinner)` → total = Σ potential over picks whose team equals `koWinner[match]`. Pure and allocation-light.

## 3. Chalk-biased opponent field

- [x] 3.1 Add a named, exported constant `PUBLIC_CHALK_GAMMA` (default > 1) for the chalk bias.
- [x] 3.2 Add a top-down, feasible opponent sampler: walk matches in bracket order; at each match resolve the two participants from the opponent's own feeder picks (R32 = fixed field), compute Elo head-to-head `p` for each, form shares `q ∝ p^γ`, and draw the winner with the RNG. Return a feasible `Prediction`.

## 4. Nested Monte Carlo

- [x] 4.1 Add the evaluator: validate completeness first; for `trials` iterations, play out one `koWinner`, sample `K = poolSize − 1` opponent brackets (resampled each trial), score the user and all opponents against that same outcome (common random numbers), and record the user's score, rank, and win credit.
- [x] 4.2 Aggregate: win probability (sum of fractional win credits / trials), finish distribution over ranks 1..poolSize (summing to 1) with expected finish, and the user's points-range percentiles (e.g. p10/p50/p90 of their per-trial score).
- [x] 4.3 Tie handling: win credit `1/t` for a `t`-way tie at the top; finish rank `1 + #{opponents strictly above}`.
- [x] 4.4 Completeness: return a discriminated result — an explicit incomplete signal for an incomplete prediction, the full estimate otherwise.

## 5. Per-pick leverage

- [x] 5.1 Add an on-demand leverage function: for each pick, recompute the user's win probability with that single pick flipped to the model's favorite (same γ, shared seed) and report the delta. May use a reduced trial count.

## 6. Determinism & exposure

- [x] 6.1 Seed all randomness via `mulberry32`; thread the RNG through playout and opponent sampling so identical inputs reproduce exactly.
- [x] 6.2 Export the evaluator (+ types, `PUBLIC_CHALK_GAMMA`) from `lib/engine/index.ts`.
- [x] 6.3 Add a thin server helper in `lib/server/predictor.ts` that runs the evaluator from the current bracket data, supplying the Elo `matchupWinProb` (from `TEAM_ELO`) and default seed/trials. No UI.

## 7. Tests

- [x] 7.1 Determinism: two runs with the same prediction, pool size, γ, seed, and trials return identical estimates and leverage.
- [x] 7.2 Sanity: pool size 1 → win probability 1, expected finish 1; the chalk bracket out-finishes an all-underdog bracket at equal settings.
- [x] 7.3 Opponent field: sampled opponent brackets are feasible; higher γ raises how often opponents pick the favorite.
- [x] 7.4 Tie handling: a two-way tie for first contributes 0.5 to win probability; competition rank counts only opponents strictly above.
- [x] 7.5 Completeness: an incomplete prediction returns the incomplete signal (no finish numbers); a complete one returns the full estimate with a finish distribution summing to 1.
- [x] 7.6 Leverage: flipping a contrarian pick to the favorite changes win probability in the expected direction.

## 8. Spec sync

- [x] 8.1 Confirm the implementation matches every scenario in `specs/pool-finish-simulation/spec.md`; keep code and spec in sync.
