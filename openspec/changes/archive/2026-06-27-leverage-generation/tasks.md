## 1. Leverage-driven generator (engine)

- [x] 1.1 Add `generateByLeverage(snapshot, opts)` to `lib/engine/leverageGenerator.ts`: a greedy bidirectional local search seeded from a starting bracket (`start`, the heuristic bracket; chalk when omitted). Opts include `matchupWinProb`, `model`, `stageWinProb` (for candidate ranking), `poolSize`, `seed`, `start`, search `trials`, a `maxFlips`/budget, candidate cap, and epsilon.
- [x] 1.2 Each step: gather candidate toggles — revert any current upset, plus add a plausible new underdog (real-underdog gate, capped to top-K by reach plausibility); for each, build the one-flip bracket (re-resolve downstream for feasibility) and score win probability with `evaluatePoolFinish` under a SHARED seed (common random numbers) at the reduced search `trials`.
- [x] 1.3 Commit the flip with the largest positive Δ over the current bracket's win probability (require Δ > a small epsilon to avoid committing noise); stop when no flip qualifies or the budget cap is hit.
- [x] 1.4 Re-evaluate the chosen bracket once at full trials; return the complete `Prediction` and the achieved win probability. The result is complete, feasible, and — because the search starts at the seed and only commits strictly-better flips — never worse than the seed (and chalk stays reachable).
- [x] 1.5 Determinism: thread one seed through the whole search so identical inputs+seed reproduce exactly; export from `lib/engine` index.

## 2. Server + API

- [x] 2.1 In `lib/server/predictor.ts`, add a `strategy: "heuristic" | "leverage"` param to `generatePrediction` (default `"heuristic"`). Always build the heuristic bracket; for `"leverage"`, pass it as the `start` seed to `generateByLeverage` with the Poisson `headToHead`, the per-team reach odds `stageWinProb`, the outcome `model`, and a risk-scaled `maxFlips`.
- [x] 2.2 In `app/api/predictor/generate/route.ts`, accept an optional `strategy` (validate against the two values; unknown → heuristic) and pass it through.

## 3. Build box UI

- [x] 3.1 In `app/components/BracketVerdict.tsx`, add an "Optimize for win %" control (toggle + button label) next to the risk slider; on use, POST `strategy: "leverage"`, show a loading state while it runs, then `onGenerate(picks)` as today; show an error and leave the bracket unchanged on failure.

## 4. Tests

- [x] 4.1 Engine (inject a synthetic `matchupWinProb`/`stageWinProb`/evaluator): the search takes positive-lift flips and skips negative ones; output is complete and feasible.
- [x] 4.2 Engine: seeded search reverts a seeded upset that no longer helps; never returns below the seed's win probability and keeps the seed when nothing helps; determinism (same inputs+seed → identical bracket); the search is bounded (asserts a cap on evaluator calls).
- [x] 4.3 Route: `POST /api/predictor/generate` with `strategy: "leverage"` returns a complete 31-pick bracket; omitted/invalid strategy returns the heuristic bracket (unchanged); reproducible for the same seed.

## 5. Verify

- [x] 5.1 Verified in preview (balanced, seed 1): leverage verdict win % ≥ heuristic for every pool size — pool 4 ties 34.66% (gate reverts to heuristic), pool 20 wins 7.04% vs 4.30% (+2.74), pool 40 ties 1.887% (floor gate caught the old from-chalk regression that scored 1.78% before the fix). No server errors.

## 6. Spec sync

- [x] 6.1 Specs updated to Option 1 (seeded bidirectional search, "never worse than the heuristic seed", boldness not forced monotonic); Option 2 (beam / path-aware search) recorded as a deferred follow-up in `design.md`. Confirm code matches every scenario in `specs/leverage-generation/spec.md` and `specs/bracket-verdict-card/spec.md`.
