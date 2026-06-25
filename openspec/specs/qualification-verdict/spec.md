# qualification-verdict Specification

## Purpose
TBD - created by archiving change deterministic-scenario-engine. Update Purpose after archive.
## Requirements
### Requirement: Top-two qualification verdict

The system SHALL classify each team's chance of finishing in the top 2 of its group as exactly one of `clinched`, `eliminated`, or `alive`, considering all combinations of remaining group fixtures. Because top-2 qualification is monotonic in a team's own goal difference, the system SHALL enumerate remaining fixtures as win/draw/loss outcomes and evaluate margin-sensitive tiebreaks at boundary margins (smallest decisive margin and a saturating large margin) rather than enumerating unbounded scorelines; this enumeration SHALL be complete for the classification.

#### Scenario: Margin-sensitive classification via boundaries

- **WHEN** a team's top-2 fate depends on its goal difference in a remaining match
- **THEN** the classification evaluates the boundary margins and yields `clinched` only if the team finishes top 2 even at its worst admissible margin, and `alive` if it finishes top 2 at some but not all boundaries

#### Scenario: Clinched top two

- **WHEN** a team finishes in the top 2 of its group under every possible combination of remaining group results
- **THEN** the team is classified `clinched`

#### Scenario: Eliminated from top two

- **WHEN** a team cannot finish in the top 2 under any possible combination of remaining group results
- **THEN** the team is classified `eliminated`

#### Scenario: Still alive

- **WHEN** a team finishes top 2 under some but not all remaining-result combinations
- **THEN** the team is classified `alive`

### Requirement: Required results for alive teams

For each `alive` team, the system SHALL report the result conditions in the team's remaining fixture(s) that guarantee a top-2 finish, and the result condition(s) that would eliminate it from the top 2.

#### Scenario: Self-determined qualification

- **WHEN** an alive team can guarantee top 2 with a specific result it controls (e.g. a win in its last match)
- **THEN** the system reports that result as sufficient to clinch

#### Scenario: Dependent qualification

- **WHEN** an alive team's top-2 fate also depends on another fixture's outcome
- **THEN** the system reports both the team's own required result and the dependency on the other fixture

#### Scenario: Elimination conditions

- **WHEN** a specific remaining result would eliminate an alive team from the top 2
- **THEN** the system reports that result as eliminating

### Requirement: Third-place hand-off

The system SHALL identify teams whose only remaining route to advancement is finishing third (best-third-placed qualification) and SHALL mark these for the probabilistic layer rather than deciding their cross-group fate.

#### Scenario: Third-place-only path flagged

- **WHEN** a team cannot reach the top 2 but could finish third
- **THEN** the verdict marks the team as eligible for best-third-placed qualification and defers the advance/eliminate decision to the probabilistic layer

#### Scenario: No false elimination of third-place contenders

- **WHEN** a team is out of the top 2 but still mathematically able to finish third
- **THEN** the team is NOT classified `eliminated` outright; its third-place eligibility is surfaced

