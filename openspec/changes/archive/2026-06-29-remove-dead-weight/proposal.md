# Remove dead weight (behavior-preserving cleanup)

## Why

Earlier UX changes removed features but left their code behind: the **PNG/PDF export** was
removed (only CSV remains), and the **win % / verdict** were removed from the post-bracket
panel. The backing endpoints, server helpers, and even a whole UI component are still in the
tree but **never reached by the running app**. They are dead weight: they bloat the codebase,
keep stale specs alive, and confuse anyone reading the code.

This change inventories that dead weight and removes it **without changing how the app runs**.
Everything listed has been verified as unreachable from the live app (the client calls only
four endpoints; the orphaned UI component is never rendered). The safety net is the existing
gate: `typecheck` + the full test suite + `build` must stay green, and the app must look and
behave exactly as it does today.

## What Changes

All verified unreachable from the running app:

- **Endpoints (+ their tests):**
  - `GET /api/share` — the PNG share card (removed PNG/PDF export).
  - `POST /api/predictor/pool-finish` — the verdict/win-% pool-finish endpoint.
  - `POST /api/predictor/verdict-note` — the Analyst-written verdict sentence.
- **Server helpers** in `lib/server/predictor.ts` with no remaining caller: `cardSummary`,
  `poolVerdict`, `poolFinish` (the wrapper), `poolFinishLeverage` (and their result types).
- **Verdict text modules:** `lib/scout/verdict.ts` and `lib/predictor/verdictText.ts` (used
  only by the removed verdict-note endpoint).
- **Share encoding:** `lib/predictionCode.ts` (`encode`/`decodePrediction`, used only by the
  removed share route).
- **UI dead code** in `app/components/BracketPredictor.tsx`: the `Headline` "Your scorecard"
  component (projected score, "Still alive", etc.) and its `Row` helper — **defined but never
  rendered** — plus the now-unused client `Evaluation` fields (`survival`, `headlineSurvival`,
  `projectedScore`, `upsetBonusMax`, `boldnessShare`).
- **Repo junk:** the committed `docs/images/.DS_Store` (and a `.gitignore` entry for it).

## Spec sync

These removals retire stale specs:

- Retire the **`predictor-share-card`** capability (the share card is gone).
- Remove the endpoint requirements from **`bracket-verdict-card`**: *Pool-finish verdict
  endpoint*, *Verdict note endpoint*, *Verdict note may use expert notes*.
- Fix drift in **`bracket-predictor-ui`** *"Live scoring and headline figures"*: the
  post-bracket panel no longer shows a verdict/headline figure (it was decluttered); the
  requirement still claims a pool-finish-verdict headline, which the dead `Headline` component
  was the last vestige of.

## Out of scope (flagged for a separate decision — see design)

- `GET /api/groups` and `GET /api/groups/[id]` — a tested, clean read API the **app itself
  doesn't call** (the dashboard is server-rendered). Removable, but not required for "runs the
  same"; left in pending your call.
- Trimming the now-unused **engine** outputs (`headlineSurvival`, `projectedScore`, etc.) from
  `prediction-model-comparison` — deeper and heavily tested; deferred to keep this change safe.

## Safety guarantee

Nothing here is on the running app's path. Acceptance is: `npm run typecheck`, the full Vitest
suite, and `npm run build` all pass, and the UI is visually and behaviourally unchanged.
