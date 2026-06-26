## ADDED Requirements

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

The system SHALL provide a scoring mode that builds on `bracket-prediction-scoring` and awards a correct pick points that increase as the model's **pre-knockout** probability of that pick decreases, so that correctly calling a long shot the model doubted is worth more than calling chalk — and a correctly-called upset keeps its full reward even after it has happened. Only `correct` picks SHALL earn contrarian points; the adjustment factor SHALL be configurable but SHALL be monotonically non-increasing in the model probability.

#### Scenario: Rare correct calls outscore chalk

- **WHEN** two correct picks in the same round have different model probabilities
- **THEN** the pick with the lower model probability earns at least as many points as the higher-probability pick, and strictly more when the probabilities differ

#### Scenario: Only correct picks earn contrarian points

- **WHEN** a pick is `wrong`, `busted`, or `pending`
- **THEN** it earns zero contrarian points

#### Scenario: Adjustment decreases with model probability

- **WHEN** the contrarian factor is evaluated across model probabilities
- **THEN** it never increases as the model probability increases

### Requirement: You-vs-model divergence

The system SHALL produce a comparison of the fan's prediction to the model's "chalk" bracket — the prediction formed by taking, at each match, the participant the model rates more likely to win. The system SHALL report, per pick, whether the fan agrees with the chalk pick, and an aggregate divergence measure (e.g. the count or share of picks differing from chalk).

#### Scenario: Chalk bracket derived from the model

- **WHEN** the chalk bracket is computed
- **THEN** each chalk pick is the more-likely-to-win participant of that match per the model

#### Scenario: Per-pick agreement reported

- **WHEN** a fan's pick matches the chalk pick for a match
- **THEN** that pick is marked as agreeing with the model; otherwise it is marked as diverging

#### Scenario: Aggregate divergence reflects contrarian-ness

- **WHEN** a fan's bracket differs from chalk on more matches
- **THEN** the aggregate divergence measure is correspondingly higher

### Requirement: Pure and deterministic comparison

The system SHALL expose the comparison as a pure function over a prediction, a snapshot, and the simulation inputs (trial count and seed), with no UI, network, or storage dependencies, returning identical results for identical inputs.

#### Scenario: Deterministic for the same inputs

- **WHEN** the comparison is run twice with the same prediction, snapshot, trial count, and seed
- **THEN** it returns identical per-pick probabilities, survival values, contrarian scores, and divergence
