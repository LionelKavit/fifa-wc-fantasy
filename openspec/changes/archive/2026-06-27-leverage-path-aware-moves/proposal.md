## Why

The shipped leverage strategy is a **single-flip** bidirectional local search seeded from the heuristic bracket. In large pools the win usually comes from a **coherent contrarian path** — backing a dark horse through several consecutive rounds — but *no single flip* raises win probability on its own: an underdog only pays off if you advance it past *every* round together (picking it to win the QF is worthless if your bracket has it losing the R16). The single-flip greedy therefore can't assemble such a path, and the full-trials floor gate just returns the heuristic unchanged (this is exactly why pool 40 ties today instead of improving).

Adding composite **"ride a dark horse"** moves — advance one plausible underdog through *K* consecutive rounds as a single atomic move — lets the search reach those coordinated brackets directly. It captures most of Option 2's large-pool upside at a fraction of the cost of full beam search, and it's the move set beam search ([[leverage-beam-search]]) will later expand. Engine-only; the `leverage` strategy and the Build-box "Optimize for win %" toggle are unchanged.

## What Changes

- **Extend the candidate move set** in `generateByLeverage` (engine only). In addition to the existing single-match flips (both directions: take an underdog / revert one), each step also considers **composite path-aware moves**: pick a plausible underdog `U` at a frontier match and advance it forward through up to `D` consecutive rounds, atomically selecting `U` as the winner of every match on its path (re-resolving downstream for feasibility). A depth-1 path move is just the existing single flip (deduplicated).
- **Score each composite move as one unit** under common random numbers at the reduced search trials; commit the move with the largest positive Δ over the current bracket; repeat until no move helps or the budget is hit.
- **The full-trials floor gate is unchanged**: after the search, re-evaluate the chosen bracket and the heuristic seed at full trials and keep whichever is better (seed wins ties). The "never worse than the heuristic seed" guarantee is preserved (the search still only commits strictly-better moves, and the gate is the backstop).
- **Bound the added cost**: cap the path **depth** `D` (a dark horse can advance at most to the final) and the number of dark-horse **candidates** per step; keep the whole search deterministic given inputs + seed.
- **No API or UI change**, and no change to the pool-finish sim, the heuristic generator, scoring, or the head-to-head model.

## Capabilities

### Modified Capabilities
- `leverage-generation`: the leverage search's move set gains composite path-aware ("ride a dark horse") moves alongside single-match flips, with their own depth/candidate cost bounds; the determinism, common-random-numbers, and full-trials floor guarantees are unchanged.

## Impact

- **Engine** (`lib/engine/leverageGenerator.ts`): add composite-move generation (enumerate a dark horse's forward path to depth `D`, dedup against single flips), fold it into the existing greedy loop and `selected`-set top-down rebuild; add `maxPathDepth` (and reuse `candidateCap`) options. Pure/deterministic.
- **Tests** (`lib/engine/leverageGenerator.test.ts`): a constructed case where a multi-round dark-horse path raises win probability but no single flip does — the composite move is taken; the floor gate still reverts an overfit composite; determinism; bounded evaluations.
- **No change** to `lib/server/predictor.ts`, the generate/pool-finish routes, or `app/components/BracketVerdict.tsx`. Deferred follow-up: [[leverage-beam-search]].
