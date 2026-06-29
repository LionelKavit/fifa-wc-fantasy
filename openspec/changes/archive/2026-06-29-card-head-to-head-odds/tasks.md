## 1. Card display

- [x] 1.1 `app/components/BracketPredictor.tsx`: the picked-team per-pick percentage uses `info.headToHead` (head-to-head vs predicted opponent) instead of `info.modelProb`. R32 per-team head-to-head (`slot.winProb`) is unchanged.

## 2. Evaluation tool

- [x] 2.1 `lib/scout/tools.ts` (`evaluate_bracket`): per-pick `win` uses `p.headToHead` instead of `p.modelProb`, so the card and the Analyst report the same number for a pick.

## 3. Tests

- [x] 3.1 `evaluate_bracket` tool test: a pick's `win` equals the head-to-head vs its predicted opponent (not the marginal reach), within the fixture's monotone matchup model.

## 4. Verify

- [x] 4.1 Live preview: a future-round pick's card % now equals the head-to-head vs its predicted opponent and matches the Analyst's compare/evaluate number for that pick. Engine-generated bracket unchanged. No console errors.
- [x] 4.2 Chat text alignment fix (separate styling fix): user and assistant messages read left-aligned inside their bubbles, no weird wrapping.

## 5. Spec sync

- [x] 5.1 Confirm code matches the MODIFIED requirements in `specs/bracket-predictor-ui/spec.md` and `specs/scout-tools/spec.md`.
