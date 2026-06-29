## Why

The engine is complete — bracket, deep-run odds, prediction, scoring, and the "you vs. the model" comparison — but none of it is playable. This change is the surface that turns it into the flagship Predictor: an interactive knockout bracket a fan fills in, that scores live against reality and against the model, with the headline survival % front and centre. It's what makes the whole feature something fans click, fill, and screenshot.

## What Changes

- Add an interactive **bracket tree** view (Round of 32 → Final): the fan clicks a winner in each match and it advances up the tree, with later-round slots populated by earlier picks (driven by the `bracket-prediction` model).
- **Persist the fan's picks locally** (browser storage, no account for v1) so a partly-filled bracket survives a reload, keyed to the locked bracket.
- Reflect **lock state**: editable until the first knockout kicks off, read-only afterwards (per `bracket-prediction`).
- Show the **scoring and comparison** as the tournament unfolds: per-pick status colour (pending/correct/wrong/busted), the round-weighted and contrarian scores, the **headline survival %** ("as it stands"), and the you-vs-model divergence — all from `bracket-prediction-scoring` and `prediction-model-comparison`.
- Surface **upset/cinderella flags** inline (matchups where the model rates the favourite low), from `knockout-probability`.
- Provide the **data + evaluation API** the view needs: an endpoint for the current bracket (with baseline odds) and an endpoint that evaluates a submitted prediction (scoring + model comparison) server-side, since the simulation is too heavy for the browser.

This change is **UI + API**; it consumes the existing engine and does not change engine behaviour. Share-card image generation and Scout narration are separate Phase-E changes.

## Capabilities

### New Capabilities
- `bracket-predictor-ui`: the interactive bracket tree, local persistence of picks, lock-aware editing, and rendering of live scoring, contrarian totals, the headline survival %, divergence, and inline upset flags.

### Modified Capabilities
- `tournament-data-api`: add a bracket endpoint (structure + baseline deep-run odds) and a prediction-evaluation endpoint (scoring + model comparison) so the client can render without running the simulation.

## Impact

- **New UI** under `app/` (e.g. a `/predictor` route + components such as a bracket tree and match-slot button), reusing the existing component/styling conventions (original styling only, no FIFA imagery).
- **New API routes** under `app/api/` and additions to the cached tournament-data provider; reuses `buildBracket`, `knockoutProbabilities`, `scorePrediction`, and `compareToModel`.
- **Note (non-standard Next.js)**: the repo uses a non-standard Next.js — implementation must follow `node_modules/next/dist/docs/` before writing app code.
- **Depends on** the full engine: `knockout-bracket-structure` (A), `knockout-advancement-odds` (B), `bracket-prediction-model` + `bracket-prediction-scoring` (C), `prediction-vs-model` (D).
- **Performance**: the evaluation endpoint runs the Monte Carlo (two simulations for comparison); it SHALL reuse the existing cached-provider pattern and the snapshot-only baseline so repeated requests don't re-simulate unnecessarily.
- **No** breaking changes to existing pages or APIs.
