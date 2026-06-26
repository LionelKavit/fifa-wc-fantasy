## Why

The Predictor should feel like the bracket pools fans actually play in their group chats, offices, and classes — and it should help them *choose* a bracket before they submit it elsewhere. Two gaps today: (1) the "contrarian" and "divergence" numbers don't behave like a real pool's upset scoring (divergence cascades to 100% off a single early upset, and the contrarian factor isn't tied to per-match upset size), and (2) there's no way to **simulate a bracket's score from the model's predictions** — the single most useful thing for deciding which bracket to enter. This change reshapes scoring into a familiar pool format and adds a projected-score core feature.

## What Changes

- **Per-match boldness** (replaces cascading divergence): a pick counts as bold only when the fan takes the side the model rates *less likely to win that specific match* (given the fan's own predicted matchup). Picking a favourite is never "bold," even if the path diverged earlier. Report a per-pick bold flag and an aggregate boldness count/share.
- **Upset bonus = the contrarian score** (a real-pool add-on): a correct pick of a head-to-head underdog earns a bonus **on top of** its base points, increasing as the underdog's win probability falls and zero at a 50/50. Favourite picks earn base only. Total pool score = base + upset bonus.
- **Head-to-head probability per pick**: expose the model's probability the picked team beats its predicted opponent (0.5 = toss-up), which drives boldness and the upset bonus — distinct from the marginal "reaches this round" probability.
- **Projected (expected) score from predictions**: compute a bracket's expected total under the model — `Σ P(pick comes true) × (base + upset bonus)` — plus per-pick expected points, available before any match is played. This is the "simulate your score to choose a bracket" feature.
- The champion remains scored on winning the Final only (the road/opponents never score), consistent with the existing model.

Base point weights are pool-sized (R32→F: 10, 20, 40, 80, 160 — a perfect bracket = 800), and the upset bonus is bounded (head-to-head floored at 5%, so a nailed long shot pays up to ~9× the base).

## Capabilities

### New Capabilities
<!-- None; this reshapes existing comparison behaviour. -->

### Modified Capabilities
- `prediction-model-comparison`: redefine "contrarian-adjusted scoring" as a per-match **upset bonus** (head-to-head, only for correctly-called underdogs, added to base); redefine "you-vs-model divergence" as **per-match boldness**; add **projected (expected) score** and **per-pick head-to-head probability + expected points**.

## Impact

- **Engine**: `lib/engine/predictionVsModel.ts` — add head-to-head probability per pick (matchup-conditional where available, else derived from marginals), per-match boldness, the upset-bonus formula, and the projected-score computation (linear in the per-pick probabilities; no extra simulation). `lib/engine/types.ts` gains the new fields.
- **UI** (`bracket-predictor-ui`, still in-flight): surface **Projected Score** as a headline alongside survival, show per-pick expected points and the bold/upset marker, and replace the divergence stat with boldness. Updated as part of implementing this change.
- **Depends on** `knockout-advancement-odds` (odds + matchups), `bracket-prediction-scoring` (base points/status), `prediction-vs-model` (the comparison this refines).
- **No** change to base point weights, the survival metric, or `bracket-prediction-scoring`'s reality-based status/points. Backwards-compatible at the API shape level except for the renamed/added comparison fields.
