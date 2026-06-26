## ADDED Requirements

### Requirement: Projected Round-of-32 fill

The system SHALL be able to fill undetermined Round-of-32 slots with the model's most-likely occupants as a fallback, so a complete bracket is available before the real teams are known. Using per-group finishing-position probabilities (`advancement-probability`): a group-winner slot SHALL be filled with that group's most-likely winner, a runner-up slot with its most-likely runner-up, and the third-placed slots with the projected best-eight third-placed teams allocated via the Annex C allocation. The projected occupants of a group SHALL be a coherent assignment (a distinct team per position). Every slot filled this way SHALL be flagged as **projected** rather than presented as an official team.

#### Scenario: Placeholders filled with projected teams

- **WHEN** a bracket is built with projection enabled and a Round-of-32 slot's real occupant is not yet known
- **THEN** the slot is filled with the model's most-likely team for that position and flagged as projected

#### Scenario: Projected group positions are coherent

- **WHEN** a group's winner and runner-up slots are projected
- **THEN** they are filled with two distinct teams (the projected 1st and 2nd of that group), not the same team twice

#### Scenario: Projected thirds use the Annex C allocation

- **WHEN** the projected best-eight third-placed teams are placed
- **THEN** each is assigned to a third-placed Round-of-32 slot via the Annex C allocation, within that slot's candidate groups

### Requirement: Real results take precedence over projection

The system SHALL prefer real resolution over projection: a Round-of-32 slot whose occupant is known from a finalized group or a declared Round-of-32 fixture SHALL show that concrete team (not flagged projected), and only genuinely undetermined slots SHALL be projected. With projection disabled, undetermined slots SHALL remain candidate-set/position placeholders as before.

#### Scenario: Known team is not overridden by projection

- **WHEN** a slot's occupant is already known from real results
- **THEN** the bracket shows the real team and does not mark it projected

#### Scenario: Projection is opt-in

- **WHEN** a bracket is built without projection enabled
- **THEN** undetermined Round-of-32 slots remain placeholders and none are filled with projected teams
