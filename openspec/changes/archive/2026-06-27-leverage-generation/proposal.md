## Why

The current generator picks upsets by a *proxy* — plausibility × differentiation — under a risk/pool budget. It never asks the actual question ("does this raise my chance to win the pool?"), so the bracket it produces likely isn't the best one (a user asked "is 9% the best you can do?"). Leverage-driven generation optimizes the **end metric directly**: it builds the bracket that maximizes the user's pool-win probability, using the Phase-2 pool-finish sim. This is the principled upgrade we deferred — added as a second strategy, not a replacement for the fast heuristic.

## What Changes

- **New engine strategy** that produces a complete, feasible bracket by **greedily maximizing pool-win probability**:
  - Start from chalk (the model favorite at every match).
  - At each step, consider flipping each plausible-underdog candidate to its underdog and estimate the flip's **win-probability lift** with `evaluatePoolFinish` under **common random numbers** (same seed → same simulated outcomes and the same sampled opponent field for every candidate, so the deltas are comparable and low-variance). Commit the flip with the largest positive lift; repeat until no flip raises win probability or a budget cap is hit. Re-evaluate the chosen bracket once at full trials.
  - Candidates are the plausible underdogs only (reuse the existing real-underdog gate), re-resolved top-down so the bracket stays feasible after each flip.
  - It **auto-calibrates boldness to the pool** (stops early when chalk is near-optimal in a small pool; takes more upsets in a large one); the risk level biases the budget cap / aggressiveness.
  - **Deterministic** given inputs + seed; a new seed (Regenerate) can yield a different optimized bracket via a different sampled field.
- **Cost control (the crux)** — it's the slowest path: common random numbers across candidates; a **reduced trial count** during the search with a single full-trials final evaluation; candidate pruning (plausible underdogs, capped per step); a bounded number of greedy steps / a server step-or-time budget. It is an explicit action with a loading state, **not** the instant default.
- **Server:** a strategy selector on generation — `POST /api/predictor/generate { poolSize, risk, strategy: "heuristic" | "leverage" }` (default `heuristic`) — reusing the Poisson head-to-head, the per-team reach odds, the outcome model, and `evaluatePoolFinish`. Returns the picks (and may return the achieved win probability).
- **UI:** the Build box offers an "Optimize for win %" option next to the risk slider; choosing it runs the leverage strategy with a loading state, then populates the editable bracket exactly like a normal generate so the verdict re-evaluates.
- **The heuristic generator stays the fast default;** this adds a second strategy.

## Capabilities

### New Capabilities
- `leverage-generation`: the greedy, win-probability-maximizing bracket strategy (common random numbers, reduced-trial search + full final eval, pruning, budget cap, deterministic), exposed via the generation endpoint's `strategy` selector.

### Modified Capabilities
- `bracket-verdict-card`: the Build box gains an "Optimize for win %" option that runs the leverage strategy (with a loading state) and populates the editable bracket like a normal generate.

## Impact

- **Engine** (`lib/engine`): a new leverage-driven generator (e.g. `generateByLeverage`) reusing `evaluatePoolFinish` + the candidate gate + top-down feasibility; pure/deterministic; built for common random numbers and reduced search trials.
- **Server** (`lib/server/predictor.ts`, `app/api/predictor/generate/route.ts`): `generatePrediction` gains a `strategy` arg; the route validates `strategy` and dispatches; reuses `headToHead`, `stageWinProb` (reach odds), and `buildOutcomeModel`.
- **UI** (`app/components/BracketVerdict.tsx`): an optimize toggle/button → POSTs `strategy: "leverage"`, loading state, `onGenerate(picks)` as today.
- **No change** to the pool-finish sim, the heuristic generator (kept as default), scoring, or the unified head-to-head model. Deferred: configurable pool scoring; making leverage the default if it proves fast enough.
