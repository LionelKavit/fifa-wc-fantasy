## Context

The predictor can score (Phase 1), estimate pool finish (Phase 2), and render a verdict (Phase 3) — but the user still fills 31 matches by hand. Phase 4 generates a grounded starting bracket. The pieces to reuse: `buildBracket` + the bracket layout (R32 fixed field, KO feeders), the Phase 1 `DEFAULT_STAGE_WEIGHTS` + `upsetMultiplier` + `UPSET_MULTIPLIER_CUTOFFS`, `mulberry32`, and server-side `eloHeadToHead` (P(a beats b)). The chalk walk (`chalkPrediction` in `lib/server/predictor.ts`) already shows the top-down favorite pattern.

The Build box lives in the verdict card's incomplete state; generating must populate the predictor's existing picks state so the result is editable and persists.

## Goals / Non-Goals

**Goals:**
- A pure, seeded generator: risk + pool size → a complete, feasible bracket whose boldness is calibrated and whose upsets are grounded by value.
- A pure pool-size → risk recommendation.
- Build box UI (risk slider + recommendation + Generate) that populates an editable bracket.

**Non-Goals:**
- No LLM (Phase 5), no external/pundit data (Phase 6), no regenerate-in-place / personas / leverage UI (Phase 7).
- Not a pool-finish optimizer: the generator uses a fast value heuristic (a proxy for differentiation), not per-candidate `evaluatePoolFinish` runs.

## Decisions

**1. Chalk baseline + a budget of value-ranked upsets, applied top-down.**
- Pass 1: walk matches in bracket order picking the Elo favorite → the chalk bracket and its per-match participants.
- Score each match's upset opportunity: `value = roundWeight × upsetMultiplier(p_underdog) × p_underdog`, counting only real underdogs (`multiplier ≥ 2`, i.e. `p_underdog < upper cutoff`). This rewards plausible-but-contrarian upsets and weights deeper rounds.
- Choose the top-`B` matches by value (seed breaks ties).
- Pass 2: walk top-down again; at a chosen match pick the underdog of the *actual* participants, else the favorite. Re-resolving participants each step keeps the bracket feasible when an early upset changes who advances.

**2. Budget `B` from risk × pool size.** A small table maps risk to a base count and a pool-size bump, e.g. roughly: `safe → 0`, `balanced → ~3`, `bold → ~6`, plus a mild increase for larger pools (more differentiation needed), capped so it stays sensible. Exact constants are tunable in implementation; the spec only fixes the monotonic ordering (safe ≤ balanced ≤ bold; larger pool ≥ smaller).

**3. Risk recommendation.** Pure thresholds on pool size → `{ risk, rationale }`: small (e.g. ≤ ~8) → safer ("chalk usually wins a small pool"); large (e.g. > ~30) → bolder ("you need upsets to stand out"); between → balanced. Thresholds are tunable constants.

**4. Server + API.** `generateBracket(poolSize, risk)` in `lib/server/predictor.ts` injects `eloHeadToHead` + the projection into the engine and returns `[matchId, teamId][]`. `POST /api/predictor/generate` validates `{ poolSize, risk }` (risk ∈ the three levels) and returns the picks.

**5. UI wiring.** `BracketVerdict`'s incomplete branch becomes the Build box (risk slider with the recommendation surfaced + Generate). `BracketPredictor` passes an `onGenerate(picks)` that sets + persists the picks (reusing the existing pick/persist path) so the populated bracket is editable and cascades correctly. Generate confirms before overwriting existing picks. After populating, completeness flips and the verdict card shows.

**6. Determinism.** Seed `mulberry32` (fixed default server-side) so the same risk + pool size yields the same bracket; randomness only breaks equal-value ties.

## Risks / Trade-offs

- **Heuristic vs. true pool-finish optimum.** Value (round × multiplier × prob) is a fast proxy for differentiation, not the exact win-probability lift `evaluatePoolFinish` would measure. Accepted for speed and explainability; a later phase could refine the top picks with leverage.
- **Feasibility after upsets.** An upset removes a team the chalk bracket advanced; the second top-down pass re-resolves participants so downstream picks stay valid (a chosen-but-now-impossible upset simply resolves against whoever is actually there).
- **Budget calibration.** The risk→`B` and pool-size bump constants are judgment calls; they're isolated constants and the spec only pins the monotonic behavior, so they're easy to tune from feel.
- **Overwrite UX.** Generate replaces existing picks; a confirm guards accidental loss. The Build box only shows while incomplete, so this mainly affects partially-filled brackets.
