## ADDED Requirements

### Requirement: Seeded win-probability maximization

The system SHALL provide a generation strategy that produces a complete, feasible bracket by maximizing the user's pool-win probability via a greedy **bidirectional local search seeded from a starting bracket** (the heuristic bracket; chalk when no seed is supplied). At each step it SHALL evaluate flipping each candidate match in **either direction** — taking an underdog at a match that is currently a favorite pick, or reverting a current upset back to its favorite — estimate each flip's change in win probability via the pool-finish evaluator, and commit the flip with the largest positive change; it SHALL stop when no candidate flip raises win probability or a budget cap is reached.

The result SHALL be at least as good (in estimated win probability, at the full trial count used for reporting) as the seed bracket; because every upset can be reverted, chalk SHALL remain reachable. The greedy commits flips on a reduced search trial count and can overfit that sample (a flip that helps at low trials may not hold at full trials, especially in large pools where true gains are below the low-trial noise floor), so after the search the system SHALL re-evaluate both the chosen bracket and the seed at the full trial count and return whichever is actually better (the seed winning ties). Seeding from the heuristic (which already places coordinated upset paths) avoids the chalk local optimum a from-chalk single-flip greedy falls into in large pools; the full-trials floor means the worst case is simply returning the heuristic unchanged.

#### Scenario: Optimized bracket is never worse than the heuristic seed

- **WHEN** the leverage strategy runs seeded from the heuristic bracket for a pool size
- **THEN** the returned bracket's estimated win probability is greater than or equal to the seed bracket's, evaluated under the same settings (and therefore also at least as good as chalk)

#### Scenario: Reverts a seeded upset that no longer helps

- **WHEN** the seed bracket contains an upset whose reversal raises the estimated win probability
- **THEN** the bidirectional search reverts that upset

#### Scenario: Stops when no flip helps

- **WHEN** no remaining candidate flip raises the win probability
- **THEN** the strategy stops and returns the current bracket (it does not take a flip that lowers win probability)

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

To keep the comparison fair and the cost bounded, the strategy SHALL evaluate all candidate flips within a step against the **same** sampled outcomes and opponent field (common random numbers via a shared seed), use a **reduced trial count** during the search, and perform a single **full-trials** evaluation of the chosen bracket at the end. It SHALL prune candidates to plausible underdogs (the real-underdog gate), cap the candidates considered per step, and bound the number of greedy steps (or a time budget). It is acknowledged to be the slowest generation path.

#### Scenario: Candidates compared under shared randomness

- **WHEN** several candidate flips are scored within one greedy step
- **THEN** they are evaluated against the same simulated outcomes and the same sampled field, so their win-probability deltas are directly comparable

#### Scenario: Final evaluation at full trials

- **WHEN** the greedy search finishes
- **THEN** the chosen bracket is evaluated once at the full trial count before being returned

#### Scenario: Search is bounded

- **WHEN** the strategy runs
- **THEN** the number of greedy steps and the candidates per step are bounded, so the work is capped regardless of bracket size

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
