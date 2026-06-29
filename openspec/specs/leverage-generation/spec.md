# leverage-generation Specification

## Purpose

A second, opt-in bracket generation strategy that builds the bracket directly maximizing the user's pool-win probability (via the pool-finish simulation), seeded from and never worse than the fast heuristic generator. It complements — does not replace — the default heuristic generator.

## Requirements

### Requirement: Seeded win-probability maximization

The system SHALL provide a generation strategy that produces a complete, feasible bracket by maximizing the user's pool-win probability via a **beam search** seeded from a starting bracket (the heuristic bracket; chalk when no seed is supplied). The search SHALL maintain up to `W` distinct candidate brackets, seeded with the heuristic-derived state and — when `W > 1` — also the chalk state (so that `W = 1` starts at the seed and reduces exactly to the hill-climb; chalk stays reachable via reverts and the full-trials floor regardless). Each round it SHALL expand every beam member by a set of candidate **moves** — each of: a single-match flip in either direction (taking an underdog at a match currently picked for the favorite, or reverting a current upset), or a composite path-aware move that advances one underdog through several consecutive rounds at once — estimate each child's win probability via the pool-finish evaluator, deduplicate identical states, and keep the top-`W`. It SHALL stop when no member's best child improves on its parent by more than a small epsilon, or a round budget is reached. With `W = 1` the search reduces to a single-state greedy hill-climb.

The result SHALL be at least as good (in estimated win probability, at the full trial count used for reporting) as the seed bracket; because the heuristic seed is always in the beam (and chalk for `W > 1`) and every upset can be reverted, chalk SHALL remain reachable. The search scores children on a reduced search trial count and can overfit that sample, so after the search the system SHALL re-evaluate both the best beam state and the seed at the full trial count and return whichever is actually better (the seed winning ties). The full-trials floor means the worst case is simply returning the heuristic unchanged; the beam can only raise the ceiling.

#### Scenario: Optimized bracket is never worse than the heuristic seed

- **WHEN** the leverage strategy runs seeded from the heuristic bracket for a pool size
- **THEN** the returned bracket's estimated win probability is greater than or equal to the seed bracket's, evaluated under the same settings (and therefore also at least as good as chalk)

#### Scenario: Reverts a seeded upset that no longer helps

- **WHEN** the seed bracket contains an upset whose reversal raises the estimated win probability
- **THEN** the search reverts that upset

#### Scenario: Stops when no move helps

- **WHEN** a full round produces no child that improves on the current best by more than epsilon
- **THEN** the strategy stops and returns the best bracket found (it does not return a bracket worse than the seed)

#### Scenario: Complete and feasible

- **WHEN** the strategy returns a bracket
- **THEN** every knockout match is picked and every later-round pick is a winner of one of its feeder picks

### Requirement: Pool-size-aware boldness

The number of upsets the strategy takes SHALL emerge from optimizing win probability rather than being fixed: a small pool (where chalk is near-optimal) tends toward few upsets, and a larger pool (where differentiation pays off) tends toward more. The count is NOT guaranteed to be monotonic in pool size — the search returns whatever bracket maximizes estimated win probability from the seed. The risk level SHALL bias the budget cap / how aggressively the strategy spends, but SHALL NOT force flips that lower win probability.

#### Scenario: Small pool stays near chalk

- **WHEN** the strategy runs for a very small pool
- **THEN** it takes few or no upsets (close to chalk)

#### Scenario: Boldness follows win probability, not a fixed schedule

- **WHEN** the strategy runs for any pool size
- **THEN** the number of upsets is whatever maximizes estimated win probability from the seed, and the result is never worse than the heuristic seed or chalk

### Requirement: Common random numbers and bounded cost

To keep the comparison fair and the cost bounded, the strategy SHALL evaluate all candidate brackets within a round against the **same** sampled outcomes and opponent field (common random numbers via a shared seed), use a **reduced trial count** during the search, and perform a single **full-trials** evaluation of the chosen bracket (and the seed) at the end. It SHALL prune candidates to plausible underdogs (the real-underdog gate), cap the single-flip and dark-horse candidates considered per state, cap the depth of composite path-aware moves, cap the **beam width `W`**, and bound the number of rounds (or a time budget). It is acknowledged to be the slowest generation path.

#### Scenario: Candidates compared under shared randomness

- **WHEN** several candidate brackets are scored within one round
- **THEN** they are evaluated against the same simulated outcomes and the same sampled field, so their win-probability estimates are directly comparable

#### Scenario: Final evaluation at full trials

- **WHEN** the beam search finishes
- **THEN** the best beam bracket is evaluated at the full trial count before being returned

#### Scenario: Search is bounded

- **WHEN** the strategy runs
- **THEN** the beam width, the candidates per state, the composite-move depth, and the number of rounds are all bounded, so the work is capped regardless of bracket size

### Requirement: Beam search over candidate brackets

The leverage search SHALL keep up to `W` distinct candidate brackets (a beam) rather than a single state, expanding all of them each round and retaining the top-`W` by estimated win probability. The beam SHALL include the heuristic seed among its initial states, and — when `W > 1` — also chalk; identical states SHALL be deduplicated so the beam holds `W` distinct brackets. This lets the search hold a promising-but-currently-worse line and so reach better brackets than a single-state hill-climb, while remaining deterministic and bounded.

#### Scenario: Beam reaches a bracket the hill-climb misses

- **WHEN** the best bracket requires keeping a candidate line that is not the single best move at some round
- **THEN** a beam of width greater than one can retain and extend that line, returning a bracket with estimated win probability at least as high as the width-one hill-climb on the same inputs

#### Scenario: Width one reduces to the hill-climb

- **WHEN** the beam width is one
- **THEN** the search behaves exactly as the single-state greedy hill-climb (same result for the same inputs and seed)

#### Scenario: Deterministic under a fixed seed with stable tie-breaking

- **WHEN** the beam search runs twice with the same inputs and seed
- **THEN** it returns identical picks, with ties in estimated win probability broken by a stable total order on the bracket state

### Requirement: Path-aware composite upset moves

The leverage search SHALL include **composite "ride a dark horse" moves** in its candidate set: a move that selects a single plausible underdog and advances it through up to a bounded number of consecutive rounds at once, taking that team to win every match along its forward path (with the bracket re-resolved top-down so it stays feasible). A composite move SHALL be scored and committed as a single unit, so the search can reach a coordinated multi-round upset path even when no single-match flip on that path raises win probability on its own. A depth-one composite move is equivalent to a single-match flip and SHALL NOT be double-counted.

#### Scenario: Assembles a multi-round path no single flip would

- **WHEN** advancing one underdog through several consecutive rounds raises the estimated win probability, but flipping any single match on that path alone does not
- **THEN** the composite path-aware move is taken, so the returned bracket backs that underdog across those rounds

#### Scenario: Composite moves respect the floor gate

- **WHEN** a composite move improves the estimate at the reduced search trials but the chosen bracket is not actually better than the heuristic seed at full trials
- **THEN** the full-trials floor gate returns the heuristic seed (the result is never worse than the heuristic)

#### Scenario: Composite move depth is bounded

- **WHEN** the search enumerates composite moves
- **THEN** each move advances a dark horse by at most the bounded depth (no further than the final), keeping the per-step work capped

### Requirement: Deterministic generation

Generation SHALL be deterministic: identical inputs (pool size, risk, field, probabilities, seed, trial counts) SHALL produce an identical bracket. A different seed MAY produce a different optimized bracket (via a different sampled field), so "regenerate" yields variety.

#### Scenario: Repeatable under a fixed seed

- **WHEN** the strategy runs twice with the same inputs and seed
- **THEN** it returns identical picks

### Requirement: Strategy selector on generation

The generation endpoint SHALL accept a strategy selector choosing between the existing heuristic generator (the default) and the leverage strategy, returning the generated picks (and it MAY return the achieved win probability). An invalid strategy SHALL be rejected or fall back to the default without failing an otherwise valid request.

#### Scenario: Leverage strategy requested

- **WHEN** the endpoint receives a valid pool size and risk with `strategy: "leverage"`
- **THEN** it returns a complete bracket produced by the leverage strategy

#### Scenario: Default strategy unchanged

- **WHEN** no strategy (or `strategy: "heuristic"`) is supplied
- **THEN** the endpoint returns the heuristic bracket exactly as before
