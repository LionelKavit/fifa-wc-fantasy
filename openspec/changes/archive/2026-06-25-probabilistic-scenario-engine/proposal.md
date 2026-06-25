## Why

The deterministic layer answers top-2 fate within a group, but the question fans actually can't reason about is the **best 8 third-placed teams across 12 groups** — a third-place team's fate depends on results in 11 other groups. This change adds probability: simulate the remaining group fixtures to produce each team's chance of advancing to the Round of 32, plus conditional breakdowns ("100% if you win, 64% on a draw, 11% if you lose"). This is the differentiated insight no scoreboard provides, and it is only meaningful during the live group stage.

## What Changes

- Add the deterministic FIFA rule for ranking the 12 third-placed teams and selecting the best 8, with full tiebreakers (points → goal difference → goals scored → fair play → lots).
- Add a Monte Carlo simulator over the remaining group fixtures: sample scorelines from a per-fixture outcome model, recompute final standings and the best-8 third-place table per trial, and aggregate advancement frequency per team.
- Produce per-team advancement probability to the Round of 32, combining clinched/eliminated determinism with simulated third-place outcomes.
- Produce conditional probabilities for a team's own next result (advance % given win / draw / loss).
- Make the simulation reproducible (seedable RNG) and fast (target tens of thousands of trials in well under a second), so results can refresh live.

## Capabilities

### New Capabilities

- `third-place-ranking` — deterministic best-8-of-12 third-placed-team selection under FIFA tiebreakers, given a complete set of group results.
- `advancement-probability` — Monte Carlo estimation of each team's Round-of-32 advancement probability and conditional-on-own-result breakdowns.

### Modified Capabilities

None.

## Impact

- New code under `lib/engine/` (e.g. `thirdPlace.ts`, `montecarlo.ts`, `probability.ts`), pure/seedable functions consuming the `TournamentSnapshot` and the deterministic layer's standings/verdicts.
- Depends on `data-ingestion-layer` and `deterministic-scenario-engine`; adds no new data fetching.
- Outputs consumed by the LLM (plain-English explanation) and UI in later changes.
- No required new runtime dependencies (a small seedable RNG may be added or hand-rolled).
