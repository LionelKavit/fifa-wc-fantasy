## Why

This is the part nobody else has. Every other bracket game scores you against reality. Pocket Scout has an odds engine — so it can also score you against **the model**. That turns a filled-in bracket into a headline stat fans screenshot and argue about: *"Your bracket has a 3.1% chance of surviving the Round of 16,"* and *"Bold — the model gives that Final pick a 4% shot."* This change adds the comparison layer that makes the Predictor uniquely ours: per-pick model probabilities, a bracket survival probability, contrarian-adjusted scoring that rewards calling upsets the model doubted, and a you-vs-model divergence summary.

## What Changes

- Annotate each pick with the **model's probability** that it comes true (from `knockout-probability`): for a pick to win a match, the model's probability that the picked team achieves that result.
- Compute a **bracket survival probability** per round — the model's probability that *all* of a fan's picks through that round hold — estimated by simulation (the fraction of trials in which the bracket is still perfect at that stage). The headline "still alive %" is survival through the latest decided round (or through the Final).
- Add **contrarian-adjusted scoring**: building on `bracket-prediction-scoring`, a correct pick's points scale **inversely** with the model's probability of that pick, so correctly calling a long shot is worth more than calling chalk. The contrarian factor is configurable but SHALL decrease as model probability rises.
- Produce a **you-vs-model divergence** summary: the model's "chalk" bracket (its most-likely pick per match), per-pick agreement/disagreement, and an aggregate measure of how contrarian a fan's bracket is.
- Keep it **pure and deterministic**: a function over a prediction, a snapshot, and the simulation, with no UI/storage.

This change is **engine + spec only**: no UI, no API, no share-card rendering (that's a later change that consumes these numbers).

## Capabilities

### New Capabilities
- `prediction-model-comparison`: compare a fan's prediction to the model — per-pick model probability, bracket survival probability per round, contrarian-adjusted scoring, and the chalk-bracket / divergence summary.

### Modified Capabilities
<!-- None. Reads knockout-probability, bracket-prediction, bracket-prediction-scoring, and knockout-bracket; changes none of their requirements. -->

## Impact

- **New engine module** under `lib/engine/` (e.g. `predictionVsModel.ts`) plus tests; pure functions over a `Prediction` (from `bracket-prediction`), a snapshot, and the simulation/odds (`knockout-probability`).
- **Likely a small simulation addition**: estimating bracket survival needs the simulation to evaluate a prediction per trial (reusing the existing knockout play-out). This extends the Monte Carlo consumer; it does not change `advancement-probability` or the existing `knockout-probability` outputs.
- **Depends on** `knockout-advancement-odds` (B — stage and matchup probabilities), `bracket-prediction-model` and `bracket-prediction-scoring` (C), and `knockout-bracket-structure` (A). No change to their requirements.
- **No** API, UI, dependency, or breaking changes. Feeds the predictor UI and the share-card feature, which render these numbers.
