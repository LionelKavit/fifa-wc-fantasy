## ADDED Requirements

### Requirement: Group standings computation

The system SHALL compute, for each of the 12 groups, an ordered table from completed group-stage fixtures, awarding 3 points for a win and 1 for a draw, and accumulating played, won, drawn, lost, goals for, goals against, and goal difference per team.

#### Scenario: Points and goals accumulated from completed fixtures

- **WHEN** standings are computed for a group with completed fixtures
- **THEN** each team's points, played count, goals for/against, and goal difference reflect only completed fixtures involving that team

#### Scenario: Scheduled fixtures excluded

- **WHEN** a group has scheduled (unplayed) fixtures
- **THEN** those fixtures do not contribute to any team's tallies

### Requirement: FIFA tiebreaker ordering

The system SHALL order tied teams using the FIFA World Cup group ranking criteria in sequence: (1) greater number of points in all group matches; (2) goal difference in all group matches; (3) goals scored in all group matches; then, for teams still equal, the same three criteria applied only to matches between the tied teams (head-to-head); then (4) fair-play/disciplinary points; then (5) drawing of lots.

#### Scenario: Separation by goal difference

- **WHEN** two teams have equal points but different goal difference
- **THEN** the team with the superior goal difference is ranked higher

#### Scenario: Head-to-head applied among tied teams

- **WHEN** two or more teams are equal on points, goal difference, and goals scored across all matches
- **THEN** the system re-ranks the tied teams using points, goal difference, and goals scored from only the matches played between those tied teams

#### Scenario: Deterministic final ordering

- **WHEN** teams remain equal after all sporting criteria
- **THEN** the system produces a stable, deterministic ordering (e.g. via a defined lots tiebreak) so results are reproducible

### Requirement: Provisional standings with live fixtures

The system SHALL support a provisional standings view that optionally folds the current scoreline of a live (in-progress) fixture into the table, while the default view counts only completed fixtures.

#### Scenario: Default excludes live scores

- **WHEN** standings are computed in default mode and a fixture is live
- **THEN** the live fixture's current scoreline does not affect the table

#### Scenario: Provisional includes live score

- **WHEN** standings are computed in provisional mode
- **THEN** the live fixture's current scoreline is applied as if final, and the table is marked provisional
