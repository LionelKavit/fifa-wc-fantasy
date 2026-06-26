## ADDED Requirements

### Requirement: Self-computed Annex C third-placed allocation

The system SHALL be able to assign the eight best third-placed teams to their Round-of-32 slots **without** an authoritative snapshot assignment, consistent with FIFA's Annex C, for the combination of group letters that produced the eight qualifiers. The assignment SHALL be derived from FIFA's official per-slot **candidate sets** (encoded as data) by computing a perfect matching that places each qualifying group into a slot whose candidate set permits it — guaranteeing every assignment is one FIFA's rules allow. It SHALL be used whenever a bracket is built from a snapshot whose Round-of-32 fixtures are not yet assigned (notably each Monte Carlo trial). When an authoritative snapshot assignment is available, the existing grounded resolution SHALL take precedence. Where more than one valid matching exists for a combination, the system SHALL choose a deterministic canonical one so results are reproducible.

#### Scenario: Allocation derived from qualifying group letters

- **WHEN** the eight qualifying third-placed teams and their group letters are known and no snapshot Round-of-32 assignment exists
- **THEN** the system assigns each third-placed team to a Round-of-32 slot whose candidate set includes that team's group, consistent with FIFA's Annex C

#### Scenario: Allocation varies with which groups qualify

- **WHEN** two different combinations of group letters qualify among the best eight third-placed teams
- **THEN** the system produces the corresponding distinct assignments, so the third-placed-to-slot mapping reflects the actual qualifying combination

#### Scenario: Valid assignment for every combination

- **WHEN** the allocation is computed for any of the 495 possible combinations of eight qualifying groups
- **THEN** each of the eight third-placed Round-of-32 slots receives exactly one of the eight qualifying teams, none duplicated or omitted, and no team is assigned to a slot outside its candidate group set

#### Scenario: Forced placements are honored

- **WHEN** a qualifying group appears in only one slot's candidate set (e.g. group K, or group L)
- **THEN** the system assigns that group to its sole permitted slot

#### Scenario: Grounded assignment takes precedence

- **WHEN** the snapshot already carries an authoritative Round-of-32 assignment for a third-placed slot
- **THEN** the system uses that grounded assignment rather than the self-computed allocation

#### Scenario: Deterministic canonical choice

- **WHEN** a combination admits more than one valid matching
- **THEN** the system returns the same deterministic assignment every time for that combination
