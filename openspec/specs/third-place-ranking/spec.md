# third-place-ranking Specification

## Purpose
TBD - created by archiving change probabilistic-scenario-engine. Update Purpose after archive.
## Requirements
### Requirement: Best-eight third-placed selection

Given a complete set of group results, the system SHALL rank the 12 third-placed teams and select the 8 that qualify for the Round of 32, using FIFA criteria in sequence: points → goal difference → goals scored → fair-play/disciplinary points → drawing of lots.

#### Scenario: Eight qualifiers selected

- **WHEN** all 12 groups have final standings
- **THEN** the system identifies each group's third-placed team and returns exactly 8 as qualified and 4 as not qualified

#### Scenario: Ranking by points then goal difference

- **WHEN** two third-placed teams differ on points
- **THEN** the team with more points ranks higher; if points are equal, goal difference then goals scored decide

#### Scenario: Deterministic resolution of full ties

- **WHEN** third-placed teams remain equal after all sporting and fair-play criteria
- **THEN** the system resolves the order deterministically (defined lots seed) so the selected 8 are reproducible

### Requirement: Third-place ranking is pure and reusable

The system SHALL expose third-place ranking as a pure function over a complete results set so it can be invoked both for a concrete scenario and inside each Monte Carlo trial.

#### Scenario: Same input yields same output

- **WHEN** the ranking function is called twice with identical final standings
- **THEN** it returns identical qualified/not-qualified sets

