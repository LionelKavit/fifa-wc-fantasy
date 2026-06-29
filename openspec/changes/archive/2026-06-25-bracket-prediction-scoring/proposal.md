## Why

A filled-in prediction (`bracket-prediction`) is only fun if it's scored as the tournament unfolds — green for a hit, red for a miss, and the gut-punch of a "busted" branch when the team you had lifting the trophy goes out in the Round of 32. This change defines how a locked prediction is scored against reality: the per-pick status, the round-weighted points, and the running/maximum totals that drive the leaderboard. It's the second half of the predictor core.

## What Changes

- Introduce **prediction scoring**: compare a locked prediction against the actual results in the tournament snapshot (via the real `knockout-bracket`) and award points for correct picks.
- Define **round-weighted points**: a correct pick is worth more in later rounds (a correct Final pick beats a correct Round-of-32 pick). The weights are configurable, but SHALL increase by round.
- Define **per-pick status**: each pick is `pending` (undecided and still alive), `correct` (matched the real winner), `wrong` (the pick's match was decided against it), or `busted` (the picked team did not — and can no longer — reach that match because it was eliminated earlier in reality).
- Expose **aggregate totals**: the current score and the **maximum still-achievable** score (current points plus the best possible from picks not yet dead), so a fan always knows where they stand and what's left to play for.
- Keep scoring **pure**: a function over a prediction and a snapshot, with no UI/storage.

This change is **engine + spec only**: no UI, no API, no leaderboard storage.

## Capabilities

### New Capabilities
- `bracket-prediction-scoring`: scoring a locked prediction against actual results — per-pick status (pending/correct/wrong/busted), round-weighted points, and current plus maximum-achievable totals.

### Modified Capabilities
<!-- None. Reads `bracket-prediction` (the prediction model) and `knockout-bracket` (actual results); changes neither's requirements. -->

## Impact

- **New engine module** under `lib/engine/` (e.g. `predictionScore.ts`) plus tests; pure functions over a `Prediction` (from `bracket-prediction`) and the actual `Bracket` (from `knockout-bracket`).
- **Depends on** `bracket-prediction-model` (the prediction + derived structure) and `knockout-bracket-structure` (actual winners and who really reached each match). No change to their requirements.
- **Leaderboard / multi-player ranking is out of scope**: this produces one prediction's score; aggregating across fans is a later concern.
- **No** API, UI, dependency, or breaking changes. Feeds the predictor UI and the "you vs. the model" contrarian scoring later.
