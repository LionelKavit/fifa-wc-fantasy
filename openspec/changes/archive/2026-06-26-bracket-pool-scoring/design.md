## Context

`compareToModel` (from `prediction-vs-model`) already runs the baseline + live simulations and returns per-pick marginal probabilities, survival, a contrarian score, and a (cascading) divergence. This change reshapes the model-aware scoring into a familiar pool format — base points plus an upset bonus tied to per-match upset size — fixes divergence to be per-match boldness, and adds a projected (expected) score so a fan can simulate a bracket before entering it.

## Goals / Non-Goals

**Goals:**
- Per-match boldness (no cascading): bold = took the head-to-head underdog of that match.
- Upset bonus added to base points for correctly-called underdogs, scaled by upset size; = the "contrarian" number.
- Per-pick head-to-head probability + expected points.
- Projected (expected) total score from the model, computed cheaply (linear).

**Non-Goals:**
- Changing base weights (stay 1-2-4-8-16) or the reality-based status/points in `bracket-prediction-scoring`.
- Multi-fan leaderboards.
- A separate champion bonus (champion stays the Final weight; road never scores).

## Decisions

**1. Two probabilities per pick, used for different things.**
- **Head-to-head** `h` = P(picked team beats its *predicted opponent* | they meet). Drives **boldness** (h < 0.5) and **upset-bonus size**. Sums to 1 across the two participants, so 0.5 is the exact underdog line. Source: the simulation's matchup conditionals for the pair; when that pairing is too rare to estimate, fall back to the normalized marginals `mA / (mA + mB)`.
- **Marginal** `m` = P(picked team actually wins that match in reality) = its probability of reaching the next stage. Drives **P(pick correct)** for expectations. (For a fixed Round-of-32 matchup, `h ≈ m`; deeper, `m < h` because the team must also reach the match.)

**2. Upset bonus formula (configurable, monotonic).**
For a `correct` pick with head-to-head `h`: `bonus = base × max(0, 0.5/clamp(h) − 1)`, where `clamp(h)` floors `h` (e.g. at 0.05) to cap the multiplier. Properties: zero at `h ≥ 0.5` (favourite), grows as `h → 0` (e.g. h=0.25 → +1×base, h=0.1 → +4×base, capped ~+9×base at the floor). Total pool points for a pick = `base + bonus`. The floor/shape are constants; the spec fixes only "monotonic non-increasing in h, zero at ≥0.5, only when correct."

**3. Per-match boldness replaces cascading divergence.**
`bold = h < 0.5` for the pick's own predicted matchup. Boldness count/share = bold picks over all picks. This evaluates each match on its own terms, so a favourite pick is never "bold" regardless of upstream divergence — the fix the cascading version needed.

**4. Projected score is linear → cheap and exact in expectation.**
By linearity of expectation, `E[total] = Σ_picks m × (base + bonus)`, where `bonus` is the pick's upset bonus *if correct* (a property known now) and `m` is its probability of coming true. No extra simulation: it reuses the per-pick `m` already produced. Per-pick expected points = `m × (base + bonus)`; the projection is their sum. This is the "simulate your score" number and updates instantly as picks change.

**5. Naming.** Keep the requirement names (`Contrarian-adjusted scoring`, `You-vs-model divergence`) but the surfaced fields read as **upset bonus** and **boldness**; the UI labels follow suit.

## Risks / Trade-offs

- **Rare deep matchups → noisy/absent head-to-head** → fall back to normalized marginals; both are defined for every pick. Document the fallback.
- **Upset-bonus shape is a product feel** → make the floor/scale constants configurable; the spec pins only the monotonic properties so tuning doesn't churn the spec.
- **Projected score is an *expectation*, not a guarantee** → label it clearly as "projected" so users read it as an average outcome, not a promise. Variance/distribution could be added later if wanted.
- **Field renames ripple to the UI** → the predictor UI is still in-flight; update its spec/code in the same implementation pass.

## Resolved Questions

- **Base weights** → scaled ×10 to pool-sized numbers: R32→F = 10, 20, 40, 80, 160 (perfect bracket = 800).
- **Upset-bonus cap** → head-to-head floored at 5%, so the bonus caps at ~9× base: `bonus = base × max(0, 0.5/max(h, 0.05) − 1)`.
- **Headline** → Projected Score and Survival % shown as co-headlines on the predictor.

## Open Questions

- Whether to also show a projected-score *range* (e.g. 10th–90th percentile from the simulation) — deferred; the point estimate ships first.
