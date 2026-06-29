## Why

The advisor flow ends with action: after the user is happy with their bracket (and has talked it through with the Scout), they need to **take their picks to their real pool**. Since we don't host pools, export is how our advice travels — a finalize step plus a downloadable template. This closes the day-1 loop: fill → strategize → **lock → download**.

## What Changes

- Add a **finalize ("lock my picks") action** on the predictor: the user marks the bracket done and moves to export. (This is a user-driven "I'm committing to these" step, distinct from the tournament-kickoff read-only lock in `bracket-prediction`.)
- Offer **two export formats**: a **CSV** of the picks (plain, paste-into-a-sheet) and the **shareable image card** (`predictor-share-card`).
- The exported content SHALL reflect the user's current picks (and, for the card, the current evaluation), so what they download matches what the predictor shows.

This is **UI + spec only**; it reuses the prediction state and the evaluation, and the image generation lives in `predictor-share-card`. No engine changes, no new probability work.

## Capabilities

### New Capabilities
<!-- None; extends the predictor UI. -->

### Modified Capabilities
- `bracket-predictor-ui`: add a finalize-and-export step offering CSV and the shareable image card, reflecting the current picks/evaluation.

## Impact

- **UI** (`app/`): a "lock & export" control on `/predictor`; a CSV builder from the current picks (round, match, picked team); a link/button to the image card. Original styling.
- **Depends on** `bracket-predictor-ui` (picks state) and `predictor-share-card` (the image). No engine changes.
- **CSV** is generated client-side from the picks; the **image** comes from the share-card route. Both reflect the current bracket.
- **No** new endpoint required for CSV (client-side); the card uses its own route.
