## Context

`BracketPredictor.tsx` renders a `Headline` scorecard (projected score hero + still-alive / upset bonus / boldness / champion rows) with a `poolSize` control, fed by a debounced `POST /api/predictor/evaluate`. Phase 2 added `poolFinish(picks, poolSize)` → `{ complete, winProbability, expectedFinish, finishDistribution, pointsRange }` and `compareToModel` already yields the chalk (model-favorite) prediction. Phase 3 turns the panel into a "will this win my pool?" verdict using those.

Completeness is already known client-side: `filled === total` (all 31 matches picked). The evaluator and the endpoint both treat an incomplete bracket as a no-number "incomplete" case.

## Goals / Non-Goals

**Goals:**
- Swap the scorecard for a verdict card; keep `Headline` in the repo, unrendered.
- Contextual states: incomplete → prompt + pool-size input; complete → verdict (win odds, finish, you-vs-chalk, points range, template sentence).
- A thin, server-side, complete-only `pool-finish` endpoint; debounced client fetch with loading/error states.

**Non-Goals:**
- No risk slider / Generate / generator (Phase 4); no LLM-written verdict (Phase 5); no per-pick leverage UI (deferred). No engine math changes (Phases 1–2 own them).

## Decisions

**1. New `BracketVerdict` component replaces `<Headline/>` at the render site.** `Headline` stays defined and exported but is no longer mounted. `BracketVerdict` owns the `poolSize` control (lifted from `Headline`) and still reports `{ picks, poolSize }` up via the existing `onContextChange` so the Analyst keeps its context.

**2. Complete-only, debounced fetch mirroring `evaluate`.** When `filled === total`, debounce (~450ms) a `POST /api/predictor/pool-finish` with `{ picks, poolSize }`; show a loading state while in flight and an error state on failure; clear/return to the prompt when the bracket becomes incomplete again. Pool-size changes retrigger the fetch. The heavier Monte Carlo only runs on a complete bracket, so it isn't paid on every pick.

**3. Endpoint returns user + chalk in one call.** `POST /api/predictor/pool-finish` validates the body (same shape guard as `evaluate`), then a server helper runs `poolFinish` for the user's picks and for the chalk prediction (from `compareToModel`'s `chalk`) at the same pool size, returning `{ complete, user: { winProbability, expectedFinish, pointsRange }, chalkWinProbability }` — or `{ complete: false }` for an incomplete bracket. Both runs share the same seed/trials so the comparison is apples-to-apples. The Monte Carlo stays server-side.

**4. Casual-fan phrasing derived from the payload.** The hero formats `winProbability` as a percentage and `expectedFinish` as an ordinal against the pool size ("~12% to win your pool of 20", "projected ~5th of 20"). You-vs-the-model shows the two win percentages side by side. The points range shows `pointsRange.p10`–`pointsRange.p90`.

**5. Template verdict sentence.** A pure function of the payload: bucket the win probability (e.g. long shot / live / strong) and compare to chalk (ahead of / behind / level with just picking favorites), optionally noting boldness. Deterministic; the Analyst-written version is Phase 5.

**6. Cost control.** Two `poolFinish` runs per complete-bracket evaluation (user + chalk), each `trials × poolSize` opponent samples. Use the engine default trials (or a slightly reduced server default) so the call stays interactive; debounce avoids running mid-edit. Tune trials if latency is high.

## Risks / Trade-offs

- **Latency on a complete bracket.** Two Monte Carlo runs on the request thread; mitigated by complete-only triggering, debounce, a loading state, and tunable trials. If needed, the chalk reference could be cached per snapshot (it doesn't depend on the user's picks).
- **Estimator variance.** Win probability is an estimate; the card pairs it with a points range and uses soft phrasing ("about") to avoid false precision — consistent with presenting a value, not a guarantee.
- **Spec churn in `bracket-predictor-ui`.** Removing the scorecard requirement and reframing the live-scoring headline; the boldness summary remains covered by "Model comparison surfaced", and `Headline` stays in code, so nothing is actually deleted.
- **Chalk as the reference.** "You vs. the Model" uses the model's single most-likely bracket; it's a clear, grounded baseline, though a real pool's field is chalk-biased-but-varied (already modeled inside `poolFinish` for the user's own odds).
