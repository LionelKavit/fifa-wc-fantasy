# pool-finish-simulation Specification

## Purpose
TBD - created by archiving change pool-finish-simulation. Update Purpose after archive.
## Requirements
### Requirement: Pool-finish estimate

The system SHALL estimate, for a complete prediction and a pool size, how the bracket places in a pool of that size: the probability it finishes first (win probability), a finish distribution (the probability of each finishing rank and the expected finish), and the user's own points range (percentiles of the bracket's score across the simulation). The estimate SHALL be produced by a Monte Carlo over both tournament outcomes and a simulated field of opponents.

#### Scenario: Win probability and finish for a complete bracket

- **WHEN** the evaluator is run with a complete prediction and a pool size
- **THEN** it returns a win probability in [0, 1], a finish distribution over ranks 1..poolSize whose probabilities sum to 1, an expected finish, and the user's points-range percentiles

#### Scenario: Pool size of one

- **WHEN** the pool size is 1 (no opponents)
- **THEN** the win probability is 1 and the expected finish is 1

#### Scenario: A stronger bracket out-finishes a weaker one

- **WHEN** two brackets are evaluated against the same pool size, γ, seed, and trials, and one is the model's chalk bracket while the other is an obviously weak bracket (e.g. all heavy underdogs)
- **THEN** the stronger bracket has the higher win probability and better expected finish

### Requirement: Chalk-biased opponent field

The system SHALL generate each opponent bracket by sampling top-down through the bracket, respecting feasibility: a team may be picked to win a match only if it was picked to win the feeder match that delivers it there. At each match, the two participants implied by the opponent's earlier picks SHALL be assigned a public pick-share derived from the model's head-to-head win probabilities skewed toward the favorite — `share ∝ p^γ` — where `γ` is a named, configurable constant greater than 1 (so the simulated public is chalkier than the model). The opponent's pick for the match SHALL be drawn from that share.

#### Scenario: Opponent brackets are feasible

- **WHEN** an opponent bracket is sampled
- **THEN** for every later-round pick, the picked team also won its feeder match in that same opponent bracket

#### Scenario: Higher γ makes the field chalkier

- **WHEN** opponents are sampled with a larger γ, all else equal
- **THEN** opponents pick the model's favorite more often than with a smaller γ

#### Scenario: γ is configurable

- **WHEN** a different γ is supplied
- **THEN** the public pick-shares are computed against that γ

### Requirement: Scoring against a simulated outcome with common random numbers

The system SHALL, in each trial, play out a single tournament outcome over the fixed Round-of-32 field of the evaluated bracket, then score the user's bracket and every opponent bracket against that **same** outcome using the Phase 1 scoring scheme (round base × upset multiplier). A pick SHALL earn its potential points only when the picked team is the winner of that match in the trial's outcome; the per-pick potential (base × multiplier) SHALL be fixed from the model's pre-match probabilities and not vary with the outcome.

#### Scenario: User and opponents scored on the same outcome

- **WHEN** a trial is scored
- **THEN** the user's bracket and all opponent brackets are graded against the identical simulated set of knockout winners for that trial

#### Scenario: Points earned only for correctly-called winners

- **WHEN** a pick's team is the winner of that match in the trial's outcome
- **THEN** the pick earns `roundBase × multiplier`, and otherwise earns zero in that trial

### Requirement: Tie handling

The system SHALL resolve ties at the top by sharing the win: when the user ties the highest score with `t − 1` opponents, the user receives a fractional win credit of `1 / t` toward win probability. Finish position SHALL use competition ranking: the user's rank is `1 + (number of opponents strictly above the user's score)`.

#### Scenario: Shared win credit on a tie for first

- **WHEN** the user ties the top score with one opponent and no one scores higher
- **THEN** the trial contributes 0.5 toward the win probability

#### Scenario: Competition rank ignores ties below

- **WHEN** three opponents score strictly more than the user
- **THEN** the user's finish position in that trial is 4

### Requirement: Per-pick leverage

The system SHALL be able to report, for each pick, the leverage of that pick on the user's win probability: the change in win probability between the user's bracket and the same bracket with that single pick replaced by the model's favorite for that match (the field held to the same sampling). This MAY be computed on demand separately from the headline estimate.

#### Scenario: Leverage of a contrarian pick

- **WHEN** leverage is computed for a pick the user made against the favorite
- **THEN** it returns the win-probability delta attributable to that pick (positive when the contrarian pick helps, negative when it hurts)

#### Scenario: Leverage uses the same field model

- **WHEN** leverage is computed
- **THEN** the counterfactual bracket is evaluated against opponents sampled the same way (same γ), so the delta reflects only the flipped pick

### Requirement: Completeness policy

The system SHALL require a complete prediction (every knockout match picked). Given an incomplete prediction, it SHALL return a clear "incomplete" signal identifying that the bracket is not yet complete, rather than a misleading finish estimate.

#### Scenario: Incomplete bracket returns an incomplete signal

- **WHEN** the evaluator is run on a prediction that is missing one or more picks
- **THEN** it returns an explicit incomplete signal and does not return a win probability or finish distribution

#### Scenario: Complete bracket is evaluated normally

- **WHEN** every knockout match is picked
- **THEN** the evaluator produces the full estimate

### Requirement: Deterministic and pure

The system SHALL be a pure function with no UI, network, or storage dependencies. Given identical inputs — prediction, pool size, γ, seed, and trial count — it SHALL return identical results.

#### Scenario: Repeatable under a fixed seed

- **WHEN** the evaluator is run twice with the same prediction, pool size, γ, seed, and trials
- **THEN** it returns identical win probability, finish distribution, points range, and leverage

