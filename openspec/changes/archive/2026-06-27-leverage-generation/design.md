## Context

The heuristic generator (`generateBracket`) selects upsets by plausibility × differentiation under a risk/pool budget — a proxy for "will this win my pool?", not the metric itself. Phase 2 gave us `evaluatePoolFinish` (win probability via an opponent-field Monte Carlo) and `pickLeverage` (per-pick win-prob delta via a flip under a shared seed). Leverage-driven generation uses those to *directly* search for the highest-win-probability bracket, as a second strategy behind the existing fast default.

## Goals / Non-Goals

**Goals:**
- A greedy, win-probability-maximizing generator that beats-or-matches chalk and auto-calibrates boldness to the pool.
- Fair, bounded cost: common random numbers, reduced search trials + full final eval, candidate pruning, bounded steps.
- Deterministic; exposed via a `strategy` selector; surfaced as an opt-in "Optimize for win %" Build-box action.

**Non-Goals:**
- Replacing the heuristic generator or making leverage the default.
- Changing the pool-finish sim or the head-to-head model; configurable pool scoring.

## Decisions

**1. Greedy bidirectional local search, seeded from the heuristic.** Seed the search from the **heuristic bracket** (chalk when no seed is given), not from chalk. Loop: consider flipping each candidate match in **either direction** — add an upset (a plausible underdog, real-underdog gate, at a match currently picked for the favorite) or revert a current upset back to its favorite — form the bracket with that one match flipped (re-resolving downstream for feasibility), score its win probability; pick the flip with the largest positive Δ over the current bracket; commit; repeat. Stop when the best Δ ≤ ε or the budget cap is hit.

Why seed from the heuristic instead of chalk: a single flip from chalk cannot assemble the *coordinated* upsets a large pool needs (no one upset alone raises win probability), so a from-chalk single-flip greedy gets stuck at a chalk local optimum and was measured to underperform the heuristic in large pools (e.g. pool 40: from-chalk leverage 1.64% < heuristic 1.89%). Seeding from the heuristic — which already places coherent upset paths — starts the search inside a good basin; allowing reverts means it can also prune the heuristic's weaker upsets. Because the search starts at the seed and only commits strictly-better flips, the result is **never worse than the heuristic seed** (and chalk stays reachable by reverting every upset).

**2. Common random numbers.** All candidate evaluations within a step (and the current-bracket baseline) use the **same seed** → identical sampled outcomes and opponent field, so Δ = winProb(flipped) − winProb(current) is a low-variance, apples-to-apples comparison. The seed is fixed for the whole search (so the whole run is deterministic); a different input seed gives a different field draw → possibly different result (Regenerate variety).

**3. Reduced search trials + full final eval + floor gate.** During the greedy search use a small trial count (~600) — CRN keeps the *ranking* of candidates stable even at low trials. After the search, evaluate the chosen bracket at the full trial count for the reported number. Crucially, ALSO re-evaluate the **seed** at full trials and return whichever is better (seed wins ties): the greedy commits flips on the low-trial sample and can overfit it, so a flip that helped at 600 trials may not hold at 4000 (in large pools, true gains are below the low-trial noise floor). Measured: at pool 40 the search committed 3 flips that scored higher at 600 trials but evaluated *lower* at 4000 (1.78% vs the heuristic's 1.89%); the floor gate detects this and returns the heuristic unchanged. The full-trials count matches the verdict evaluator (seed 1, 4000 trials, `evaluatePoolFinish` defaults), so "Optimize ≥ Build" holds on the exact numbers the UI shows. This is the main cost lever.

**4. Pruning + bounds.** Candidates per step = plausible underdogs only (reuse the gate), optionally capped to the top-K by the cheap heuristic value (so we don't pool-finish every match). Greedy steps bounded by the risk/pool budget cap (and/or a wall-time budget) so total `evaluatePoolFinish` calls ≈ steps × K — a known, capped cost. Worst case is still heavy, so it's opt-in with a loading state.

**5. Pool-size-aware boldness emerges, but is not forced monotonic.** In a small pool chalk is near-optimal, so few flips have positive Δ and the search stays near chalk (few upsets). In a large pool more differentiation helps → more upsets. The upset count is whatever maximizes estimated win probability from the seed — *not* a guaranteed-monotonic-in-pool-size schedule (the earlier from-chalk design promised "larger pool ≥ more upsets" and failed it in practice). Risk biases the budget cap (how many flips it's allowed) and could bias the objective (e.g. weight the upper tail), but never forces a Δ ≤ ε flip.

**6. Wiring via a strategy selector.** `generatePrediction(poolSize, risk, seed?, strategy?)` dispatches: `"heuristic"` (today) or `"leverage"` (the new path, which also needs the outcome `model` for the playout, already available server-side). `POST /api/predictor/generate` validates `strategy` (default heuristic; unknown → heuristic). The Build box adds an "Optimize for win %" control that POSTs `strategy: "leverage"`, shows a loading state, and calls `onGenerate(picks)` as today.

## Risks / Trade-offs

- **Latency.** Even with CRN + reduced trials + pruning, this runs many nested Monte Carlos. Mitigations: low search trials, candidate cap K, bounded steps, a wall-time budget that returns the best-so-far. It's an explicit, loading-stated action — never the snappy default. Tune trials/K/steps to a ~1–3s budget.
- **Greedy ≠ global optimum.** Local search seeded from the heuristic guarantees "never worse than the heuristic" and escapes the chalk local optimum, but it still polishes around the seed's basin rather than finding the globally best coordinated bracket. **Deferred follow-up (Option 2):** a beam search / path-aware multi-flip move set (advance a single dark-horse underdog through several consecutive rounds as one move) to find better large-pool brackets. Parked for now — materially more work and latency, with low practical payoff on the tiny absolute win-probabilities of large pools; it would still seed from the heuristic, so this change is its prerequisite.
- **Estimator noise at low trials.** CRN largely cancels it for *ranking* flips; the final full-trials eval gives the honest reported number. Guard against committing a flip whose Δ is within noise (require Δ above a small epsilon).
- **Determinism vs. variety.** A fixed seed makes the run reproducible (good for tests); Regenerate uses a new seed → a different field draw → possibly a different optimized bracket. Both are intended.
- **Same scoring caveat as everything else.** It optimizes win probability under *our* scoring scheme + modeled field; a real pool with different rules would want configurable scoring (the other deferred item).
