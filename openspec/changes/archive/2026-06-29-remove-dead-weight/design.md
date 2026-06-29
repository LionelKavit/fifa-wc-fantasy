# Design — dead-weight inventory & safe removal

## How "dead" was established

- **Client reachability:** the entire app calls only four endpoints — `/api/chat`,
  `/api/predictor/generate`, `/api/predictor/evaluate`, `/api/bracket` (grep of every
  `fetch(...)` in `app/`). Nothing fetches `/api/share`, `/api/predictor/pool-finish`, or
  `/api/predictor/verdict-note`.
- **Render reachability:** the `Headline` component (`function Headline` in
  `BracketPredictor.tsx`) appears exactly once in the file — its definition. It is never
  mounted; the post-bracket panel is the decluttered `BracketVerdict` ("Your bracket settings").
- **Import graph:** each removed module's only importers are themselves removed (chains below).
- **OG/metadata:** `/api/share` is not referenced by any `metadata`/`openGraph`/`og:image`.

## Removal map (leaf-first, so nothing dangles)

```
/api/share/route.tsx ─uses→ cardSummary (predictor.ts) ─uses→ evaluatePrediction (KEEP)
                     └uses→ decodePrediction (predictionCode.ts)   ← encode/decode now unused
/api/predictor/pool-finish/route.ts ─uses→ poolVerdict (predictor.ts)
/api/predictor/verdict-note/route.ts ─uses→ verdictNote (scout/verdict.ts) ─uses→
                                            templateVerdict + VerdictFacts (predictor/verdictText.ts)
predictor.ts: poolFinish (no caller), poolFinishLeverage (no caller)   ← orphan wrappers
BracketPredictor.tsx: Headline (never rendered) ─uses→ Row (only here)
                      Evaluation fields: survival, headlineSurvival, projectedScore,
                                         upsetBonusMax, boldnessShare (only Headline used them)
```

**Keep (still used):** `evaluatePrediction`, `generatePrediction`, `getBracketData`,
`buildScoutBracket` (predictor.ts); the engine `evaluatePoolFinish` / `pickLeverage` /
`poolFinish.ts` (used by `bracket_strategy` and the leverage generator); the
`prediction-model-comparison` engine output (the evaluate route still returns it; the client
keeps `picks` + `score`).

## Tests to update

`app/api/routes.test.ts` and `app/api/predictor.test.ts` cover the removed endpoints — drop the
share / pool-finish / verdict-note cases with their endpoints. Any unit tests for
`scout/verdict.ts`, `predictor/verdictText.ts`, or `predictionCode.ts` go with those files.
The full suite must stay green afterwards.

## Spec deltas

- **`predictor-share-card`** — REMOVE all requirements (capability retired with the share card).
- **`bracket-verdict-card`** — REMOVE *Pool-finish verdict endpoint*, *Verdict note endpoint*,
  *Verdict note may use expert notes*.
- **`bracket-predictor-ui`** — MODIFY *Live scoring and headline figures*: the post-bracket
  panel no longer leads with a pool-finish verdict / projected-score headline; per-pick status
  and upset markers remain. (This aligns the spec with the already-shipped declutter and removes
  the last reason the dead `Headline` existed.)

## Flagged, not removed here (need your call)

- **`/api/groups`, `/api/groups/[id]`** — tested, coherent read endpoints the **app does not
  call** (the dashboard reads the provider directly in a server component). Safe to remove if we
  want a lean surface, but they don't affect "runs the same", and they may be wanted as a public
  read API. Recommendation: decide explicitly; default is to keep.
- **Engine output trimming** — once `Headline`/`cardSummary` are gone, several
  `prediction-model-comparison` fields are computed but unused. Trimming them touches a
  heavily-tested engine module for little runtime gain; defer unless we want it.

## Acceptance

`npm run typecheck`, the full Vitest suite, and `npm run build` pass; the UI is visually and
behaviourally identical to today (verified in preview on both tabs).
