## Why

A projected points total is meaningless to a casual fan — "19 points" answers nothing they care about. What they want is "will this bracket win my pool?" That is a *relative* question (you vs. a correlated field of poolmates), not an absolute one, and it's what makes correct *differentiation* — not raw accuracy — the way to win a small pool. Phase 2 builds the pure engine that computes it: an opponent-field Monte Carlo producing win probability, finish distribution, and a points range. It is the metric the Phase 3 verdict card surfaces and the signal the Phase 4 generator optimizes toward.

## What Changes

- New engine capability: given the user's **complete** prediction and a **pool size**, estimate how the bracket places — **win probability**, a **finish distribution** (probability by rank, expected finish, percentile), and the user's **own points range** (percentiles of their score).
- **Opponent field via chalk-biased sampling**: each opponent bracket is sampled **top-down, respecting feasibility** (a team can only be picked to win a later round if it was picked to win its feeder match). At each match the two participants implied by the opponent's earlier picks get a public pick-share `q ∝ p^γ` from the model's head-to-head win probabilities, with `γ` a named, tunable constant > 1 so the simulated public is chalkier than the model.
- **Nested Monte Carlo with common random numbers**: per trial, play out **one** knockout outcome over the **fixed** R32 field (the bracket the user filled), then score the user's bracket **and** `K = poolSize − 1` freshly-sampled opponent brackets against that **same** outcome using the Phase 1 scoring (doubling base × upset multiplier). Rank the user; aggregate over trials. The field is resampled each trial (the real opponents are unknown).
- **Score-against-outcome**: a scoring path that grades a prediction against a concrete simulated set of knockout winners (Phase 1's `scorePrediction` only grades against the snapshot's *real* results). Per-pick potential (base × multiplier) is fixed from Elo; whether it is earned depends on the trial's outcome.
- **Tie handling**: ties for first share the win (fractional win credit); finish position uses competition ranking (`rank = 1 + opponents strictly above`). Explicit and tested.
- **Per-pick leverage**: how much each pick moves the user's win probability vs. the field (a counterfactual that flips one pick to the favorite), to later power "which picks are winning or losing you the pool." Higher cost; computed on demand.
- **Completeness policy**: a complete bracket is required; an incomplete prediction returns a clear "incomplete" signal rather than a misleading number.
- **Deterministic/seeded**: identical inputs (prediction, pool size, γ, seed, trials) yield identical outputs; fully unit-tested.

## Capabilities

### New Capabilities
- `pool-finish-simulation`: the opponent-field Monte Carlo that estimates a bracket's finish in a pool (win probability, finish distribution, points range, per-pick leverage), with chalk-biased opponent generation, scoring against simulated outcomes, tie handling, completeness policy, and determinism.

### Modified Capabilities
<!-- none — adds a new engine capability; reuses existing scoring/simulation primitives without changing their specs -->

## Impact

- **Engine** (new `lib/engine/poolFinish.ts` + `lib/engine/index.ts` export): a pure module reusing `samplePoisson`/`mulberry32` (`rng`), the bracket layout constants (`R32_LAYOUT`, `KO_LAYOUT`, `STAGE_MATCH_NUMBERS`), `predictedParticipants`, the Phase 1 multiplier/base, and the outcome model. Includes a knockout-only playout over a fixed R32 (mirroring `montecarlo`'s extra-time/penalty resolution) and a score-against-outcome helper.
- **Server** (`lib/server/predictor.ts`): a thin helper exposes the evaluator from the current bracket data (Elo head-to-head probabilities from `buildOutcomeModel` / `TEAM_ELO`) so Phase 3 can render it. No UI in this phase.
- **No change** to existing scoring/simulation specs; `simulate` and `scorePrediction` keep their current behavior (the new score-against-outcome path is additive).
- Performance: trials, pool size, and γ are parameters; the nested loop's cost (and the leverage counterfactual's ~31× cost) is bounded by tuning trials and capping the effective field — documented in design.
