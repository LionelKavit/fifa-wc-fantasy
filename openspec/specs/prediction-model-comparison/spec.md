# prediction-model-comparison Specification

## Purpose
TBD - created by archiving change prediction-vs-model. Update Purpose after archive.
## Requirements
### Requirement: Per-pick model probability

The system SHALL annotate each of a prediction's picks with the model's probability that the pick comes true, derived from `knockout-probability`: for a pick that a team wins a given match, the model's probability that the picked team achieves the result that winning that match represents (reaching the next stage / lifting the trophy for the Final). This probability SHALL be the **pre-knockout (lock-time) forecast** — every knockout match re-simulated, ignoring already-decided real results — so that the figure reflects how unlikely the pick was *when it was made*, not post-hoc certainty. Probabilities SHALL be in [0, 1].

#### Scenario: Each pick carries a model probability

- **WHEN** a prediction is compared to the model
- **THEN** every pick is annotated with the model's pre-knockout probability of that pick coming true, in [0, 1]

#### Scenario: A bold pick reads as low probability

- **WHEN** a fan picks a team the model rates unlikely to achieve that result
- **THEN** the pick's model probability is correspondingly low

#### Scenario: A decided upset keeps its original long odds

- **WHEN** a pick has already come true in reality but the model rated it unlikely before the knockouts
- **THEN** its annotated model probability remains the low pre-knockout figure rather than collapsing to certainty

### Requirement: Bracket survival probability per round

The system SHALL compute, for a prediction, the model's probability that **all** of the fan's picks through a given round hold — the bracket's survival probability at that round — estimated by simulation as the fraction of trials in which every pick for matches up to and including that round matches the trial's outcomes. Survival SHALL be measured **"as it stands"**: any already-decided real knockout results are held fixed in the simulation, so a pick that has already failed drops the bracket's survival to zero from that round onward, and a pick already fulfilled no longer carries risk. Survival SHALL be reported per round (Round of 32 → Final) and SHALL be non-increasing across rounds. The headline "still alive" probability is the survival value for the deepest round considered.

#### Scenario: Survival is the joint probability of the picks

- **WHEN** survival through a round is computed
- **THEN** it equals the fraction of trials in which all of the fan's picks for matches up to and including that round came true

#### Scenario: Survival is monotonic across rounds

- **WHEN** survival is reported for each round
- **THEN** survival through a later round does not exceed survival through an earlier round

#### Scenario: A perfect-so-far bracket stays at its joint odds

- **WHEN** every pick through a round is plausible under the model
- **THEN** the survival probability reflects the product of those picks holding together, not any single pick in isolation

#### Scenario: An already-busted pick zeroes survival from its round

- **WHEN** a pick for a round has already failed in reality
- **THEN** survival through that round and every later round is zero

### Requirement: Contrarian-adjusted scoring

The system SHALL award an **upset bonus** on top of the base points (`bracket-prediction-scoring`) for a `correct` pick in which the fan took the **head-to-head underdog** — i.e. the participant the model rated less likely (head-to-head probability below 0.5) to win that specific match given the fan's predicted matchup. The bonus SHALL increase as the picked team's head-to-head win probability decreases and SHALL be zero at a 50/50 (and for favourite picks). Only `correct` picks earn an upset bonus; `wrong`, `busted`, and `pending` picks earn none. The combined pool score for a pick is its base points plus any upset bonus. The bonus magnitude SHALL be configurable but SHALL be monotonically non-increasing in the head-to-head probability.

#### Scenario: Correctly-called underdog earns a bonus

- **WHEN** a `correct` pick took the head-to-head underdog of its match
- **THEN** it earns its base points plus an upset bonus greater than zero

#### Scenario: Correctly-called favourite earns base only

- **WHEN** a `correct` pick took the head-to-head favourite (probability ≥ 0.5)
- **THEN** it earns its base points and no upset bonus

#### Scenario: Bigger upsets pay more

- **WHEN** two `correct` underdog picks in the same round had different head-to-head probabilities
- **THEN** the one on the longer odds earns at least as much upset bonus, and strictly more when the probabilities differ

#### Scenario: Only correct picks earn a bonus

- **WHEN** a pick is `wrong`, `busted`, or `pending`
- **THEN** its upset bonus is zero

### Requirement: You-vs-model divergence

The system SHALL measure **per-match boldness**: a pick is bold when the fan took the side the model rates less likely to win that specific match (head-to-head probability below 0.5), evaluated against the fan's own predicted matchup for that match — independent of how the rest of the bracket compares to any chalk path. The system SHALL report, per pick, whether it is bold, and an aggregate boldness measure (the count and share of bold picks). A pick on the match favourite SHALL NOT count as bold, even when earlier picks diverged from the model's most-likely bracket.

#### Scenario: Underdog pick is bold

- **WHEN** the fan picks the head-to-head underdog of a match
- **THEN** that pick is marked bold

#### Scenario: Favourite pick is not bold despite a divergent path

- **WHEN** the fan picks the match favourite, even though an earlier-round pick differed from the model's most-likely bracket
- **THEN** that pick is not marked bold

#### Scenario: Aggregate boldness counts only underdog picks

- **WHEN** boldness is aggregated
- **THEN** it reflects the number and share of picks that took the head-to-head underdog, not the number of picks differing from a cascading chalk bracket

### Requirement: Pure and deterministic comparison

The system SHALL expose the comparison as a pure function over a prediction, a snapshot, and the simulation inputs (trial count and seed), with no UI, network, or storage dependencies, returning identical results for identical inputs.

#### Scenario: Deterministic for the same inputs

- **WHEN** the comparison is run twice with the same prediction, snapshot, trial count, and seed
- **THEN** it returns identical per-pick probabilities, survival values, contrarian scores, and divergence

### Requirement: Per-pick head-to-head probability and expected points

The system SHALL expose, for each pick, the model's head-to-head probability that the picked team beats its predicted opponent (0.5 denotes a toss-up), estimated from the simulation (matchup-conditional where the pairing occurs, otherwise derived from the teams' marginal probabilities). The system SHALL also expose each pick's expected points: the probability the pick comes true multiplied by the points it would earn (base plus any upset bonus).

#### Scenario: Head-to-head probability provided per pick

- **WHEN** a prediction is compared to the model
- **THEN** each pick carries the model's head-to-head probability that the picked team wins that match, in [0, 1]

#### Scenario: Expected points reflect odds and reward

- **WHEN** a pick's expected points are computed
- **THEN** they equal the probability the pick comes true times the points it would earn if correct (base plus upset bonus)

### Requirement: Projected score from model predictions

The system SHALL compute a projected (expected) total score for a prediction from the model alone, before any knockout match is played: the sum over the fan's picks of each pick's expected points. This projection lets a fan simulate and compare brackets to decide which to enter. The projection SHALL be deterministic for a given snapshot, trial count, and seed, and SHALL equal the sum of the per-pick expected points.

#### Scenario: Projected score available before any result

- **WHEN** a fan has filled a bracket and no knockout match has been played
- **THEN** the system reports a projected total score derived from the model's probabilities

#### Scenario: Projection is the sum of per-pick expected points

- **WHEN** the projected score is computed
- **THEN** it equals the sum of the expected points of all the fan's picks

#### Scenario: Bolder brackets shift expected reward

- **WHEN** two brackets differ only in that one swaps a favourite pick for a head-to-head underdog
- **THEN** the underdog pick has a lower probability of coming true but a higher reward if it does, so its expected points reflect that trade-off rather than being identical

