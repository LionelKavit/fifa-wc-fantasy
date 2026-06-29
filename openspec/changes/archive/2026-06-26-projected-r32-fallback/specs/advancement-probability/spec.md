## ADDED Requirements

### Requirement: Per-group finishing-position probabilities

The system SHALL report, for each team, the probability that it finishes 1st, 2nd, and 3rd in its group, estimated from the same Monte Carlo trials used for advancement probability (each trial already produces a complete final ordering per group). For each group these probabilities SHALL be consistent with exactly one team per position per trial. Settled cases SHALL be respected: when a group is already final, the actual finishing positions SHALL be reported as certainties.

#### Scenario: Finishing-position probabilities reported

- **WHEN** advancement is computed for a group that is not yet decided
- **THEN** each team has a probability of finishing 1st, 2nd, and 3rd, each in [0, 1]

#### Scenario: One team per position per trial

- **WHEN** finishing-position probabilities are aggregated across trials for a group
- **THEN** the probabilities of finishing 1st sum to 1 across the group's teams (and likewise for 2nd and 3rd)

#### Scenario: Final group reports certainties

- **WHEN** a group's standings are already final
- **THEN** the actual 1st, 2nd, and 3rd placed teams are reported with probability 1 for their positions
