## 1. Remove dead endpoints (+ their tests)

- [x] 1.1 Delete `app/api/share/route.tsx`.
- [x] 1.2 Delete `app/api/predictor/pool-finish/route.ts`.
- [x] 1.3 Delete `app/api/predictor/verdict-note/route.ts`.
- [x] 1.4 Drop the share / pool-finish / verdict-note cases from `app/api/routes.test.ts` and `app/api/predictor.test.ts`.

## 2. Remove dead server / verdict / encoding code

- [x] 2.1 `lib/server/predictor.ts`: remove `cardSummary` (+ `CardSummary`), `poolVerdict` (+ `PoolVerdict`), `poolFinish` wrapper (+ `PoolFinishResult`), and `poolFinishLeverage` — confirm no remaining importers. Keep `evaluatePrediction`, `generatePrediction`, `getBracketData`, `buildScoutBracket`.
- [x] 2.2 Delete `lib/scout/verdict.ts` and `lib/predictor/verdictText.ts` (+ their tests).
- [x] 2.3 Delete `lib/predictionCode.ts` (+ its tests) — used only by the removed share route.

## 3. Remove dead UI code

- [x] 3.1 `app/components/BracketPredictor.tsx`: remove the unrendered `Headline` component and its `Row` helper; drop the now-unused `Evaluation` client fields (`survival`, `headlineSurvival`, `projectedScore`, `upsetBonusMax`, `boldnessShare`). The `/api/predictor/evaluate` response is otherwise unchanged.

## 4. Repo hygiene

- [x] 4.1 Remove `docs/images/.DS_Store` and add `.DS_Store` to `.gitignore`.

## 5. Spec sync

- [x] 5.1 Apply the deltas: retire `predictor-share-card`; remove the three endpoint requirements from `bracket-verdict-card`; modify `bracket-predictor-ui` "Live scoring and headline figures".

## 6. Verify (behavior unchanged)

- [x] 6.1 `npm run typecheck`, full Vitest suite, and `npm run build` all pass.
- [x] 6.2 Preview both tabs (Knockouts + Group stage): the UI is visually and behaviourally identical to before; autofill, evaluate, chat, and CSV export still work. No console/server errors.

## 7. Open decisions (do NOT action without confirmation)

- [x] 7.1 Decide whether to also remove `GET /api/groups` + `GET /api/groups/[id]` (tested, but not called by the app). Default: keep.
- [x] 7.2 Decide whether to trim the now-unused engine fields in `prediction-model-comparison`. Default: defer.
