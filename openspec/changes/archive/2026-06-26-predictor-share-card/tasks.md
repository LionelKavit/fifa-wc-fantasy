## 1. Prediction encoding

- [x] 1.1 Define a compact, stable encoding of a prediction (e.g. a fixed-order list of winning team ids) and decode it server-side; reused by the share link.

## 2. Card route

- [x] 2.1 Add a server-side image route that takes an encoded prediction, evaluates it (`scorePrediction` + `compareToModel`) over the current snapshot, and renders the card (follow `node_modules/next/dist/docs/` for the image-response mechanism).
- [x] 2.2 Render the card: predicted champion, headline survival %, round-weighted + contrarian scores, divergence — original styling, no FIFA imagery.
- [x] 2.3 Expose the shareable representation (link encoding the prediction) and wire a share entry point from the predictor UI.

## 3. Tests / verification

- [x] 3.1 Determinism: the same encoded prediction + snapshot renders the same card; figures match the predictor's evaluation.
- [x] 3.2 Verify in the running app (preview): generate a card from a filled bracket and confirm it shows the expected figures with original styling.

## 4. Spec sync

- [x] 4.1 Confirm implementation matches every scenario in `specs/predictor-share-card/spec.md`; update the spec if behaviour is intentionally refined.
