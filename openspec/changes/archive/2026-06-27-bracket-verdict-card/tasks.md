## 1. Server helper + API

- [x] 1.1 In `lib/server/predictor.ts`, add a verdict helper that, for `{ picks, poolSize }`, runs `poolFinish` for the user's bracket and for the chalk prediction (the `chalk` from `compareToModel`) at the same pool size/seed/trials, returning `{ complete: false }` or `{ complete: true, user: { winProbability, expectedFinish, pointsRange }, chalkWinProbability }`.
- [x] 1.2 Add `app/api/predictor/pool-finish/route.ts` (`POST`, `runtime nodejs`, `force-dynamic`): validate `{ picks: [matchId, teamId][], poolSize: number }` (mirror the `evaluate` guard), call the helper, return the payload; client-error on malformed input.

## 2. Verdict component

- [x] 2.1 Add `app/components/BracketVerdict.tsx`: owns the pool-size control; given `picks` + completeness, renders the contextual swap — incomplete → prompt + pool-size input; complete → verdict card.
- [x] 2.2 Complete-only, debounced (~450ms) `POST /api/predictor/pool-finish` on picks/poolSize change (mirror the existing evaluate fetch); show loading while in flight and an error state on failure; revert to the prompt when the bracket becomes incomplete.
- [x] 2.3 Verdict card layout: hero = win probability + projected finish phrased for a casual fan and naming the pool size; "You vs. the Model" = user win% beside chalk win%; the points range (p10–p90); the template verdict sentence. Gold/green theme, no FIFA imagery.
- [x] 2.4 Add a pure helper that builds the plain-language verdict sentence from the payload (win-probability bucket + comparison to chalk), deterministically (no LLM).

## 3. Swap into the predictor

- [x] 3.1 In `app/components/BracketPredictor.tsx`, render `<BracketVerdict/>` where `<Headline/>` was, lifting the `poolSize` state/control into it and keeping `onContextChange` reporting `{ picks, poolSize }`. Leave the `Headline` component defined but unrendered (do NOT delete it).
- [x] 3.2 Keep the existing `/api/predictor/evaluate` flow for the per-pick statuses/markers in the bracket tree (unchanged).

## 4. Verify

- [x] 4.1 Verify in preview: an incomplete bracket shows the prompt + pool-size input (no numbers); a complete bracket shows the verdict (win odds, finish, you-vs-chalk, points range, sentence); changing pool size re-evaluates; loading and error states behave. Confirm the Monte Carlo runs server-side (network call), not in the browser.

## 5. Spec sync

- [x] 5.1 Confirm the implementation matches every scenario in `specs/bracket-verdict-card/spec.md` and the modified `specs/bracket-predictor-ui/spec.md`; keep code and specs in sync.
