## 1. Seed through the generate path

- [x] 1.1 In `lib/server/predictor.ts#generatePrediction`, add an optional `seed?: number` param and pass it into `generateBracket(snapshot, { ..., seed })`.
- [x] 1.2 In `app/api/predictor/generate/route.ts`, accept an optional numeric `seed` (finite number; otherwise ignore) and forward it to `generatePrediction`. Omitted/invalid → unchanged behavior.

## 2. Rebuild controls on the verdict card

- [x] 2.1 In `app/components/BracketVerdict.tsx`, generalize the generate handler to `generate(nextRisk?, seed?)`: it POSTs `{ poolSize, risk: nextRisk ?? risk, seed }`, updates `risk` when shifted, and calls `onGenerate(picks)` on success (existing loading/error state).
- [x] 2.2 Add a rebuild row in the complete-state verdict: **Regenerate** (`generate(risk, freshSeed())`), **Bolder** (shift risk +1 toward bold, clamped), **Safer** (shift −1 toward safe, clamped), showing the current risk level. Disable Bolder at "bold" and Safer at "safe", and all while a rebuild is in flight.
- [x] 2.3 `freshSeed()` = `Math.floor(Math.random() * 2**31)` per click; on failure show the error and leave the existing bracket (only repopulate on success).

## 3. Tests

- [x] 3.1 Engine/route-level (no key needed): `generatePrediction` / the generate endpoint return the same bracket for the same `{ poolSize, risk, seed }` and may differ for different seeds; an omitted seed still returns a valid complete bracket; a non-numeric seed is ignored (still 200 + valid picks).

## 4. Verify

- [x] 4.1 Verify in preview: generate a bracket; on the verdict card, Regenerate produces a different bracket (verdict re-evaluates); Bolder/Safer shift the risk and rebuild, with the end buttons disabled at the extremes; the bracket stays editable and pool size is preserved; loading/error states behave.

## 5. Spec sync

- [x] 5.1 Confirm the implementation matches every scenario in `specs/bracket-verdict-card/spec.md` and `specs/bracket-generator/spec.md` (this change's additions); keep code and specs in sync.
