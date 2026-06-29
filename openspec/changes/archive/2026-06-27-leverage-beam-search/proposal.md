## Why

Even with composite path-aware moves ([[leverage-path-aware-moves]]), the leverage search is a **greedy hill-climb from a single state**: each step it commits the one best move and discards every alternative. In large pools several *different* contrarian lines can be close in value, and the best bracket often requires a step that is temporarily worse (or merely tied) before a later move pays off — a hill-climb can't see past that. A **beam search** keeps the top-`W` candidate brackets and expands all of them each round, exploring competing dark-horse lines in parallel before committing. It finds better large-pool brackets than the hill-climb while still being bounded and deterministic.

This is the final, highest-ceiling piece of Option 2. It **depends on and builds upon** [[leverage-path-aware-moves]] (it reuses that richer move set), and it preserves the "never worse than the heuristic seed" guarantee via the same full-trials floor gate. Engine-only; the `leverage` strategy and the Build-box toggle are unchanged.

## What Changes

- **Generalize the search from a hill-climb to a beam search** in `generateByLeverage` (engine only):
  - Maintain a **beam** of up to `W` distinct bracket states (each a `selected` set), seeded with **both the heuristic bracket and chalk** (so the floor and the chalk baseline are always in the search).
  - Each round, **expand every beam member** by all candidate moves (single-match flips + composite path-aware moves), score each child under common random numbers at the reduced search trials, **deduplicate** identical states across the beam, and keep the **top-`W`** by estimated win probability.
  - **Stop** when no member's best child improves on its parent by more than ε, or a round budget is hit.
- **Final selection via the existing floor gate**: take the best beam state, then re-evaluate it and the heuristic seed at full trials and return whichever is better (seed wins ties). The "never worse than the heuristic seed" guarantee is preserved.
- **Bounds + determinism**: a small, risk-scaled beam width `W` and a bounded number of rounds; deterministic given inputs + seed, with stable tie-breaking. `W = 1` reduces exactly to the [[leverage-path-aware-moves]] hill-climb (a clean fallback / equivalence check).
- **No API or UI change**, and no change to the pool-finish sim, the heuristic generator, scoring, or the head-to-head model. The beam width is internal (optionally risk-scaled like the move budget), not a user-facing knob.

## Capabilities

### Modified Capabilities
- `leverage-generation`: the search is generalized from a single-state greedy hill-climb to a width-`W` beam over the same move set (seeded with the heuristic and chalk, top-`W` per round, bounded rounds), preserving determinism, common random numbers, bounded cost, and the full-trials "never worse than the heuristic seed" floor.

## Impact

- **Engine** (`lib/engine/leverageGenerator.ts`): replace the single-`current` hill-climb loop with a beam (array of states + their cached search-trial scores); add `beamWidth` (and reuse the move enumeration from [[leverage-path-aware-moves]]); dedup states by a canonical key; stable ordering for determinism. Pure/deterministic. `W = 1` preserves current behaviour.
- **Tests** (`lib/engine/leverageGenerator.test.ts`): a constructed case where the beam reaches a bracket the greedy hill-climb misses (requires keeping a non-greedy alternative); `W = 1` equals the hill-climb result; the floor gate still guarantees ≥ heuristic; determinism; bounded evaluations (≈ `W × candidates × rounds`).
- **Server / UI**: unchanged (`lib/server/predictor.ts` may optionally pass a risk-scaled `beamWidth`, mirroring `LEVERAGE_MAX_FLIPS`). Deferred after this: revisit whether leverage can become the default if fast enough; configurable pool scoring.
