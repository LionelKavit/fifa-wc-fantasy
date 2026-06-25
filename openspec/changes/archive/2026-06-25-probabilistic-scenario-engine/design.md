## Context

"Layer 2" answers the question the deterministic layer defers: does a third-placed team make the best-8 cut, and with what probability? That fate is cross-group, so it requires simulating all remaining group fixtures together and re-running the FIFA best-8 selection per trial. With ~20 group fixtures remaining at the live window, the full outcome space (3^20 in W/D/L terms, more with margins) is far too large to enumerate exactly, so we estimate by Monte Carlo. This layer consumes the snapshot and the deterministic layer's standings/verdicts.

## Goals / Non-Goals

**Goals:**
- Correct, pure, reusable best-8-of-12 third-place ranking under FIFA rules.
- Fast, seedable Monte Carlo producing per-team advancement probabilities and conditional-on-own-result splits.
- Determinism where the math is deterministic: clinched → 1.0, eliminated → 0.0, never blurred by sampling noise.
- Reproducible outputs for tests (seeded RNG, fixed trial count).

**Non-Goals:**
- No knockout-bracket simulation (group stage only).
- No team-strength model tuning/calibration beyond a documented baseline (can be refined later).
- No LLM verbalization or UI.
- No new network/data work.

## Decisions

- **Monte Carlo over exact enumeration.** ~20 remaining fixtures make exact enumeration intractable; sampling tens of thousands of trials gives stable probabilities in well under a second. Alternative: exact enumeration per group + analytic cross-group combination — rejected as complex and unnecessary at target precision.
- **Per-fixture outcome model — Poisson goals, kept swappable.** The baseline samples each team's goals from independent Poisson distributions, because goal *margins* drive the GD/goals-for tiebreakers that decide the best-8 third-place cut — a plain W/D/L prior would lose that signal. Each side's Poisson rate (λ) derives from a per-team attacking/defensive strength with a modest home-advantage term; absent a richer rating source, strengths default to a neutral baseline so the model is unbiased. The model stays behind an injectable interface so it can later be upgraded (ratings, xG) without touching the simulation loop. Alternatives considered: simple W/D/L priors (rejected — no realistic margins) and hard-coded fixture probabilities (rejected — not reusable, hides the modeling choice).
- **Reuse deterministic primitives inside the loop.** Each trial reuses the standings comparator and a pure best-8 third-place ranking function, guaranteeing simulated finishes obey the same tiebreakers as real ones. Alternative: a separate simplified ranking for speed — rejected, would diverge from the real rules.
- **Pin certainty deterministically.** Teams the deterministic layer marks `clinched`/`eliminated` are reported 1.0/0.0 directly rather than read off trial frequencies, removing sampling noise on settled cases.
- **Conditional probabilities via branch filtering.** For a team's own remaining fixture, partition trials by that fixture's sampled result (win/draw/loss) and report each branch's advancement frequency; optionally stratify sampling to ensure adequate trials per branch.
- **Seedable RNG.** Use a small deterministic PRNG so identical (seed, trials) inputs reproduce identical outputs for tests.
- **Module layout:** `lib/engine/thirdPlace.ts`, `lib/engine/montecarlo.ts`, `lib/engine/probability.ts`, reusing `lib/engine/standings.ts`.

## Risks / Trade-offs

- **Outcome-model realism affects probability accuracy** → keep the model injectable and documented; ship a sane baseline and treat calibration as a later, separable concern; tests assert structural properties (monotonicity, bounds), not exact percentages.
- **Sampling noise on close calls** → default to a high trial count; pin clinched/eliminated deterministically; expose trial count and seed so callers can trade precision for speed.
- **Conditional branches with few trials** → optionally stratify by the team's own result so each branch has adequate sample size; document the approach.
- **Third-place tiebreaker bugs would skew the best-8 cut** → reuse the deterministic comparator and unit-test the ranking on constructed 12-team third-place sets.

## Migration Plan

Greenfield; depends on `data-ingestion-layer` and `deterministic-scenario-engine`. Land third-place ranking + Monte Carlo + probability aggregation with seeded tests and structural-property tests. Optional tiny PRNG dependency or hand-rolled.

## Open Questions

- Default trial count and whether to stratify conditional sampling — tune against a runtime budget during implementation.
- Whether to surface per-group "who you need to root for" hints now or defer to the LLM layer — likely defer.
