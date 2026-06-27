## Why

The Predictor's "wow" only spreads if it's shareable. The headline numbers — *"🏆 Brazil to win it · my bracket has a 3.1% chance of surviving the quarters · 73 contrarian points"* — are built to be screenshotted and posted. This change generates that shareable card as an image, so a fan can share their bracket and its odds in one tap. The credible engine numbers are what make the post worth sharing; this is the mechanism that carries them out into the world.

## What Changes

- Generate a **shareable card image** summarizing a fan's bracket: their predicted champion, the headline survival probability, the round-weighted and contrarian scores, and the you-vs-the-model divergence — rendered in the app's original styling.
- Make the card **deterministic and self-contained**: the same prediction over the same snapshot produces the same card, and the card is reachable via a stable shareable representation (an image endpoint encoding the prediction) suitable for link previews.

This change is **UI/route + spec only**: it renders numbers already produced by the engine and the predictor's evaluation; it adds no engine behaviour.

## Capabilities

### New Capabilities
- `predictor-share-card`: deterministic generation of a shareable image summarizing a fan's bracket (champion, survival %, scores, divergence) from a prediction + snapshot, in original styling, via a stable shareable representation.

### Modified Capabilities
<!-- None. -->

## Impact

- **New route** under `app/` (an image/OG endpoint) that takes an encoded prediction and renders the card; reuses the prediction-evaluation results (`bracket-prediction-scoring`, `prediction-model-comparison`).
- **Note (non-standard Next.js)**: follow `node_modules/next/dist/docs/` before adding the image route; do not assume stock OG-image tooling is available.
- **Depends on** `bracket-predictor-ui` (the prediction + its encoding/evaluation) and transitively the engine (C, D).
- **Original styling only**: no FIFA logos or imagery, consistent with the rest of the app.
- **No** breaking changes.
