## MODIFIED Requirements

### Requirement: Fixture normalization from rounds

The system SHALL flatten `rounds[].tournaments[]` into a typed `Fixture` list, each carrying home/away team ids (1–48 space), a status of `complete | live | scheduled`, scores when available, the owning round and stage, and the fixture's **goal events** (scorer, optional assister, and an own-goal flag) when the feed provides them.

#### Scenario: Completed fixture carries scores

- **WHEN** a tournament entry has status complete with home and away scores
- **THEN** the normalized `Fixture` has status `complete` and integer `homeScore`/`awayScore`

#### Scenario: Scheduled fixture has no scores

- **WHEN** a tournament entry has not been played
- **THEN** the normalized `Fixture` has status `scheduled` and null scores

#### Scenario: Group-stage fixtures are identifiable

- **WHEN** fixtures are normalized
- **THEN** each fixture exposes its stage (e.g. `GROUP`, `R32`) so group-stage fixtures can be filtered

#### Scenario: Goal events are surfaced

- **WHEN** a fixture entry includes `homeGoalScorersAssists` and/or `awayGoalScorersAssists`
- **THEN** the normalized `Fixture` exposes a `goals` list, each entry carrying the scorer's player id, the assister's player id (or null), and an `isOwnGoal` flag, flattening both sides

#### Scenario: Missing goal data is empty, not an error

- **WHEN** a fixture has no goal arrays, or a side's array is null (that side did not score)
- **THEN** the normalized `Fixture` has `goals: []` (or only the present side's events) and normalization does not fail

## ADDED Requirements

### Requirement: Goal events validated tolerantly

The data layer SHALL validate goal-event entries on a fixture as `{ playerId: number, assistId: number | null, isOwnGoal: boolean }`, accepting additional fields (passthrough) and treating the goal arrays as optional/nullable so scheduled fixtures and goalless sides parse without error. A missing or null array SHALL NOT cause validation to fail.

#### Scenario: Well-formed goal entry parses

- **WHEN** a fixture's goal array contains `{ playerId, assistId, isOwnGoal }` entries (with extra fields)
- **THEN** validation succeeds and the entries are available to normalization

#### Scenario: Own goals retain their flag

- **WHEN** a goal entry has `isOwnGoal: true`
- **THEN** the flag is preserved so downstream code can exclude it from scorer credit
