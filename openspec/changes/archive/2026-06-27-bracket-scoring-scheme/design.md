## Context

Scoring today lives in two places. `lib/engine/predictionScore.ts` (`scorePrediction`) awards a round-weighted base — `DEFAULT_STAGE_WEIGHTS = { R32: 10, R16: 20, QF: 40, SF: 80, F: 160 }`, doubling per round, points only on `correct` picks, plus a current/max-achievable total. Separately, `lib/engine/predictionVsModel.ts` (`compareToModel`) computes an *additive* `upsetBonus` (and boldness) from each pick's model win probability. A casual fan thus sees two numbers with no single answer to "what is this pick worth?"

This change unifies them: the upset reward becomes a **multiplier on the base of a correct pick**, inside `scorePrediction`. The model already exposes everything needed — `buildOutcomeModel` / `TEAM_ELO` give Elo strengths, and the engine computes head-to-head probabilities (the `compare_teams` tool already does this) — so the per-matchup win probability for the two teams a prediction pairs is available as a pure input.

This is Phase 1 of the AI bracket-builder roadmap; the pool-finish evaluator, generator, and verdict card (later phases) all score against this function.

## Goals / Non-Goals

**Goals:**
- One legible preset: base doubles per round (1/2/4/8/16), correct picks earn `base × upsetMultiplier`.
- Upset multiplier ×1/×2/×3 by underdog band, keyed to the picked team's matchup win probability, with a single named, tunable cutoffs constant (default 0.40 / 0.20).
- Per-pick transparency: expose base, win probability, multiplier, and points for every pick.
- Maximum-achievable accounts for the multiplier on `pending` picks.
- Pure, deterministic, parameterized (weights + cutoffs injectable); fully unit-tested.

**Non-Goals:**
- No opponent-field simulation, no "win my pool?" metric (Phase 2), no generator (Phase 4), no UI (Phase 3).
- No change to the `prediction-model-comparison` spec. Its now-redundant additive `upsetBonus` is reconciled when the Phase 3 verdict card rebuilds the headline; this change leaves that field in place to avoid touching display logic.
- No new scoring presets beyond this default (the function is parameterized so presets can be added later).

## Decisions

**1. Multiplier on the base, not an additive bonus.** `points = roundBase × upsetMultiplier`. Risk and round depth then compound automatically (a big-upset champion = 16 × 3 = 48), which is exactly the "deeper + bolder pays more" property, with one mechanism the UI can explain in a sentence.

**2. Multiplier bands as a named constant.** `UPSET_MULTIPLIER_CUTOFFS = { upper: 0.40, lower: 0.20 }` → ≥0.40 ×1, [0.20, 0.40) ×2, <0.20 ×3. Keeping ≥0.40 at ×1 deliberately avoids rewarding a near-coin-flip as bravery. Injectable alongside `weights` via `ScoreOptions`.

**3. Probability source = the picked team's head-to-head Elo probability in its implied matchup.** For each predicted match, the two participants are what the prediction implies meet there (via `predictedParticipants`); the multiplier uses the picked team's Elo win probability against the other. This is the honest *local* measure ("given these two meet, was your pick the underdog?") and is a pure input the caller supplies, keeping `scorePrediction` free of Monte Carlo state.

**4. Extend `PickScore`, keep the function pure.** `scorePrediction` gains a probabilities input (a per-match lookup, or a small model/ratings handle it can derive head-to-head from). `PickScore` (in `types.ts`) gains `winProb`, `multiplier`, and keeps `pointsEarned` now equal to `base × multiplier`; `roundBase` is recoverable from `weights[stage]` but is exposed for convenience. Same inputs ⇒ same output; no I/O.

**5. Default weights drop to 1/2/4/8/16.** Down from 10/20/40/80/160 — friendlier headline numbers and the values the UI copy quotes. Same strict-doubling ordering; existing scoring tests update to the new defaults.

**6. Wiring.** `lib/server/predictor.ts#evaluatePrediction` supplies the per-matchup Elo probabilities (from `buildOutcomeModel` / `TEAM_ELO`) so the multiplier is computed for the user's own matchups. No other server behavior changes in this phase.

## Risks / Trade-offs

- **Double-counting during Phase 1.** Until the Phase 3 card lands, `compareToModel.upsetBonus` and the new in-base multiplier both exist. Mitigated because the old `Headline` scorecard is being shelved; the new card consumes only the new scoring. Flagged, not fixed here, to keep scope tight.
- **Multiplier is model-dependent.** "Was it an upset?" is our Elo judgment, not an objective seed. On-brand (grounded) and the per-pick `winProb` is exposed so the UI can show the basis — but it means tuning the cutoffs/Elo affects scores. Cutoffs are a single constant to make that easy.
- **Cutoff edge behavior.** Exactly 0.40 → ×1 and exactly 0.20 → ×2 (inclusive lower bounds). Documented and unit-tested so boundaries are unambiguous.
- **Probability availability for arbitrary matchups.** Deep-round matchups in a user's bracket may pair teams the baseline odds table never simulated meeting; using the direct Elo head-to-head (not the Monte Carlo matchup table) sidesteps this and always yields a probability.
