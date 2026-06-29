## MODIFIED Requirements

### Requirement: Seeded win-probability maximization

The system SHALL provide a generation strategy that produces a complete, feasible bracket by maximizing the user's pool-win probability via a greedy local search seeded from a starting bracket (the heuristic bracket; chalk when no seed is supplied). At each step it SHALL evaluate a set of candidate **moves** — each of: a single-match flip in either direction (taking an underdog at a match currently picked for the favorite, or reverting a current upset back to its favorite), or a **composite path-aware move** that advances one underdog through several consecutive rounds at once — estimate each move's change in win probability via the pool-finish evaluator, and commit the single move with the largest positive change; it SHALL stop when no candidate move raises win probability or a budget cap is reached.

The result SHALL be at least as good (in estimated win probability, at the full trial count used for reporting) as the seed bracket; because every upset can be reverted, chalk SHALL remain reachable. The greedy commits moves on a reduced search trial count and can overfit that sample (a move that helps at low trials may not hold at full trials, especially in large pools where true gains are below the low-trial noise floor), so after the search the system SHALL re-evaluate both the chosen bracket and the seed at the full trial count and return whichever is actually better (the seed winning ties). Seeding from the heuristic (which already places coordinated upset paths) avoids the chalk local optimum; the full-trials floor means the worst case is simply returning the heuristic unchanged.

#### Scenario: Optimized bracket is never worse than the heuristic seed

- **WHEN** the leverage strategy runs seeded from the heuristic bracket for a pool size
- **THEN** the returned bracket's estimated win probability is greater than or equal to the seed bracket's, evaluated under the same settings (and therefore also at least as good as chalk)

#### Scenario: Reverts a seeded upset that no longer helps

- **WHEN** the seed bracket contains an upset whose reversal raises the estimated win probability
- **THEN** the search reverts that upset

#### Scenario: Stops when no move helps

- **WHEN** no remaining candidate move raises the win probability
- **THEN** the strategy stops and returns the current bracket (it does not take a move that lowers win probability)

#### Scenario: Complete and feasible

- **WHEN** the strategy returns a bracket
- **THEN** every knockout match is picked and every later-round pick is a winner of one of its feeder picks

### Requirement: Common random numbers and bounded cost

To keep the comparison fair and the cost bounded, the strategy SHALL evaluate all candidate moves within a step against the **same** sampled outcomes and opponent field (common random numbers via a shared seed), use a **reduced trial count** during the search, and perform a single **full-trials** evaluation of the chosen bracket at the end. It SHALL prune candidates to plausible underdogs (the real-underdog gate), cap the single-flip candidates and the dark-horse candidates considered per step, cap the **depth** of composite path-aware moves (a dark horse can advance at most to the final), and bound the number of greedy steps (or a time budget). It is acknowledged to be the slowest generation path.

#### Scenario: Candidates compared under shared randomness

- **WHEN** several candidate moves are scored within one greedy step
- **THEN** they are evaluated against the same simulated outcomes and the same sampled field, so their win-probability deltas are directly comparable

#### Scenario: Final evaluation at full trials

- **WHEN** the greedy search finishes
- **THEN** the chosen bracket is evaluated once at the full trial count before being returned

#### Scenario: Search is bounded

- **WHEN** the strategy runs
- **THEN** the number of greedy steps, the candidates per step, and the composite-move depth are bounded, so the work is capped regardless of bracket size

## ADDED Requirements

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
