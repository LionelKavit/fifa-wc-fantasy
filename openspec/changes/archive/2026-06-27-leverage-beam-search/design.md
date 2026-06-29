## Context

After [[leverage-path-aware-moves]], `generateByLeverage` is a greedy hill-climb over a rich move set (single-match flips both directions + composite dark-horse path moves), seeded from the heuristic bracket, scored under common random numbers at reduced trials, with a full-trials floor gate that returns the better of the chosen bracket and the heuristic seed. A bracket is a `selected` set of upset matches; `buildFromSelected` realizes it top-down for feasibility.

The remaining limitation is topological: the hill-climb holds **one** state and commits the single best move each step. It cannot keep a promising-but-currently-worse alternative line, so when the best large-pool bracket needs a non-greedy intermediate step (or when two contrarian lines are close), it misses it. Beam search keeps the top-`W` states and expands all of them, which is the standard fix.

## Goals / Non-Goals

**Goals:**
- Explore several candidate brackets in parallel to find better large-pool brackets than the hill-climb.
- Preserve every guarantee: determinism, common random numbers, bounded cost, and "never worse than the heuristic seed" (the full-trials floor gate).
- Make `W = 1` reduce exactly to the [[leverage-path-aware-moves]] hill-climb (clean equivalence + safe rollback).
- Engine-only, behind the existing `leverage` strategy.

**Non-Goals:**
- Any API, UI, scoring, sim, or head-to-head model change; a user-facing beam knob.
- Exotic search (simulated annealing, MCTS); making leverage the default.

## Decisions

**1. Beam state and seeding.** A beam member is a `selected` set plus its cached search-trial win estimate. Seed the beam with **both** the heuristic-derived `selected` and the empty (chalk) set, deduplicated. Including chalk and the heuristic from the start guarantees the floor and the chalk baseline are always reachable in the search.

**2. Round expansion.** Each round, for every beam member generate all candidate moves (single flips + composite path moves from [[leverage-path-aware-moves]]) and form the child `selected` sets; score each child with `evalWin(buildFromSelected(child), searchTrials)` under the one fixed search seed (common random numbers, so all states/children are comparable). Collect parents + children, **deduplicate by a canonical state key** (e.g. the sorted match-id list of `selected`), and keep the **top-`W`** by estimated win probability.

**3. Stopping.** Stop when a full round produces no child that improves the current best by more than ε, or a bounded number of rounds is reached. Track the global best state seen.

**4. Final selection = the existing floor gate.** Take the best beam state, then evaluate it and the heuristic seed at full trials and return whichever is higher (seed wins ties). This is the same gate as today, so the result is still **never worse than the heuristic seed at the reported resolution** — beam search can only raise the ceiling, never lower the floor.

**5. Determinism + tie-breaking.** All randomness is the fixed search/eval seed. Ties in win estimate are broken by a stable, total order on the canonical state key (so top-`W` selection and the final best are deterministic). Move enumeration order is already deterministic from [[leverage-path-aware-moves]].

**6. Bounds.** Evaluations ≈ `W × candidatesPerState × rounds` + the two final full-trials evals, all memoized by canonical key. Per-evaluation cost scales with pool size (`evaluatePoolFinish` samples `poolSize` opponents per trial), so for interactivity the beam must stay light. **Measured tuning** (server, balanced; large pools were the constraint): beam width risk-scaled `{safe:2, balanced:2, bold:3}`, round budget `{3,4,5}`, and a reduced **150** search trials (vs. 600 for the hill-climb) — CRN keeps low-trial rankings usable and the full-trials floor gate corrects any overfit. This lands generation at ≈4 s (pool 4), ≈9 s (pool 20), ≈21 s (pool 40), under the heavy 30 s ceiling. A wall-time budget returning best-so-far remains a future option. This is the heaviest generation path; it stays opt-in with a loading state.

**7. `W = 1` equivalence.** With width 1 and the heuristic seed, beam expansion that keeps the single best child is exactly the hill-climb. Implement so this holds (it doubles as a regression guard and a safe configuration).

## Risks / Trade-offs

- **Cost is `W×` the hill-climb.** Mitigated by a small `W`, bounded rounds, candidate caps inherited from the move set, reduced search trials, and an optional wall-time budget returning best-so-far. Acknowledged as the slowest path; opt-in only.
- **Diminishing returns on tiny absolute numbers.** In very large pools the true gap between good brackets is near the Monte-Carlo noise floor, so beam may often still land on (or near) the heuristic; the floor gate makes that a safe tie rather than a regression. Beam earns its cost mainly in mid-to-large pools where coordinated lines diverge.
- **Determinism hinges on tie-breaking.** A stable canonical state key is required; without it top-`W` selection could vary. Covered by an explicit determinism test.
- **Estimator noise across states.** Common random numbers (shared seed) keep cross-state comparisons fair at reduced trials; the full-trials floor gate gives the honest reported number and the safety guarantee.
