## 1. API (server-side)

- [x] 1.1 Add a bracket accessor to the cached tournament-data provider: `buildBracket(snapshot)` + baseline (pre-knockout) `knockoutProbabilities`, cached snapshot-only.
- [x] 1.2 Add a bracket read endpoint returning bracket structure (matches, slots, resolved teams/placeholders, winners) + baseline per-team odds + lock state.
- [x] 1.3 Add a prediction-evaluation endpoint: accept picks, validate against the bracket, run `scorePrediction` + `compareToModel`, return statuses, scores, per-pick model probabilities, survival, contrarian totals, divergence.
- [x] 1.4 Tests for both endpoints (shape, cache reuse, invalid-prediction rejection, simulation server-side only).

## 2. Predictor UI

- [x] 2.1 Add a `/predictor` route and a bracket-tree component rendering R32→Final by round (follow `node_modules/next/dist/docs/` for the non-standard Next.js).
- [x] 2.2 Match-slot interaction: click a participant → `pick(...)` updates the local prediction and advances it up the tree; changing an earlier pick cascades per the model.
- [x] 2.3 Local persistence: store/restore the prediction in `localStorage`, keyed to the R32 identity; discard on mismatch.
- [x] 2.4 Lock-aware UI: editable before first knockout kickoff, read-only after.

## 3. Scoring & comparison rendering

- [x] 3.1 Fetch evaluation (debounced) and render per-pick status colours (pending/correct/wrong/busted).
- [x] 3.2 Render the headline survival % prominently, plus round-weighted and contrarian scores.
- [x] 3.3 Render model comparison: per-pick model probability, divergence summary, inline upset/cinderella flags.
- [x] 3.4 Ensure original styling only (no FIFA imagery), consistent with existing components.

## 4. Verification

- [x] 4.1 Verify in the running app (preview): fill a bracket, see picks advance, scores/survival update, reload restores picks, locked state is read-only.

## 5. Spec sync

- [x] 5.1 Confirm implementation matches every scenario in `specs/bracket-predictor-ui/spec.md` and the added `specs/tournament-data-api/spec.md` requirements; update specs if behaviour is intentionally refined.
