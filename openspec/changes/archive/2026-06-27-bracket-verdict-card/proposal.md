## Why

The predictor's post-bracket panel leads with "projected score" — a number a casual fan cannot judge ("19 out of what? good or bad?"). The product's whole value is *pool-winning* advice, and we now have the engine to answer the question they actually care about: **will this bracket win my pool?** Phase 3 swaps the scorecard for a **verdict card** that surfaces the Phase 2 pool-finish estimate — win odds, you-vs-the-model, a points range, and a plain-language read — so the panel finally means something.

## What Changes

- Replace the post-bracket **scorecard** (`Headline` in `app/components/BracketPredictor.tsx`) with a **verdict card**. The `Headline` component is **kept in the repo** (it may power future features) — just no longer rendered. This is a swap, not a removal.
- **Contextual swap by completeness**:
  - Incomplete/empty bracket → a prompt state with the **pool-size input** (carried over from the scorecard's "Pool of" control) and a short "finish your bracket to see if it'll win your pool" message.
  - Complete bracket → the **verdict card**.
- **Verdict card content** (from the Phase 2 evaluator):
  - **Hero — "will this win my pool?"**: the win probability and projected finish in the user's pool, phrased for a casual fan ("~12% chance to win your pool of 20", "projected to finish about 5th of 20").
  - **You vs. the Model**: the user's win probability beside the model's most-likely ("chalk") bracket's win probability in the same pool, so deviations from chalk are legible.
  - **Likely points range**: the evaluator's p10–p90 of the user's own score.
  - A short **template-based** plain-language verdict sentence, derived deterministically from the numbers (the Analyst-written/LLM version is Phase 5).
- **Thin API**: `POST /api/predictor/pool-finish` accepts `{ picks, poolSize }`, runs `poolFinish` for the user's bracket **and** the chalk reference, and returns the verdict payload. The client calls it only when the bracket is complete, debounced, with loading and error states.
- Keep it honest: the pool size is shown; the verdict is complete-only; the numbers assume the Phase 1 scoring scheme and the modeled chalk-biased field.

## Capabilities

### New Capabilities
- `bracket-verdict-card`: the post-bracket verdict surface — contextual swap by completeness, the "will this win my pool?" hero, you-vs-the-model, the points range, the template verdict, and the `pool-finish` endpoint that feeds it.

### Modified Capabilities
- `bracket-predictor-ui`: the post-bracket panel is now the verdict card, not the projected-score scorecard. Remove the leaderboard-style scorecard requirement (the panel is replaced) and reframe the live-scoring headline to the pool-finish verdict; the bracket tree's per-pick status and upset markers are unchanged.

## Impact

- **UI** (`app/components/BracketPredictor.tsx` + a new `BracketVerdict` component): render the verdict card in place of `Headline`; move the pool-size control into it; add the complete-only, debounced fetch (mirroring the existing `/api/predictor/evaluate` pattern) with loading/error states. `Headline` is retained, unrendered.
- **API** (`app/api/predictor/pool-finish/route.ts`): new route calling `poolFinish` for the user's picks and the chalk bracket.
- **Server** (`lib/server/predictor.ts`): a helper that returns the verdict payload (user + chalk reference); reuses `poolFinish` and the chalk prediction from `compareToModel`.
- **No** engine change (Phases 1–2 supply the math); no risk slider / Generate (Phase 4); no LLM verdict (Phase 5); no per-pick leverage UI (deferred).
