# bracket-prediction Specification

## Purpose
TBD - created by archiving change bracket-prediction-model. Update Purpose after archive.
## Requirements
### Requirement: Prediction representation

The system SHALL represent a fan's prediction as a chosen winning team for each knockout match of a concrete `knockout-bracket` (Round of 32 → Round of 16 → Quarterfinals → Semifinals → Final). A prediction SHALL be defined over the bracket's matches, identifying each pick by match and the picked team, and SHALL leave any not-yet-picked match explicitly unpicked rather than guessing.

#### Scenario: A pick selects one participant of a match

- **WHEN** a fan picks the winner of a knockout match
- **THEN** the prediction records that team as the match's predicted winner, and the team SHALL be one of that match's two predicted participants

#### Scenario: Unpicked matches are explicit

- **WHEN** a prediction has no pick for a match
- **THEN** that match is reported as unpicked rather than defaulted to either participant

### Requirement: Path validity and upward propagation

The system SHALL keep a prediction internally consistent: the two predicted participants of any non-Round-of-32 match are the predicted winners of its two feeder matches, and a team MAY be picked to win a match only if the prediction also has it winning every earlier-round match on its path to that match. When a pick changes, the system SHALL propagate the change upward and invalidate (clear) any later pick that is no longer reachable under the new pick.

#### Scenario: Later-round participant follows from feeder picks

- **WHEN** a fan has picked the winners of two matches that feed a later match
- **THEN** the later match's two predicted participants are exactly those two picked winners

#### Scenario: Changing an earlier pick clears now-invalid later picks

- **WHEN** a fan changes an earlier-round pick so that a team they had advancing in a later round is no longer present
- **THEN** the later pick that depended on the removed team is cleared, leaving the prediction consistent

#### Scenario: Cannot pick a team that is not a predicted participant

- **WHEN** a fan attempts to pick a team for a match where that team is not one of the match's predicted participants
- **THEN** the pick is rejected and the prediction is unchanged

### Requirement: Completeness state and derived champion

The system SHALL report a prediction's completeness as empty (no picks), partial (some but not all matches picked consistently), or complete (every knockout match has a consistent pick). When complete, the system SHALL expose the derived result: the predicted winner of each match, the survivors of each round, and the single predicted champion.

#### Scenario: Partial prediction reports partial

- **WHEN** some matches are picked but at least one remains unpicked
- **THEN** the prediction's completeness is partial and no champion is derived

#### Scenario: Complete prediction yields one champion

- **WHEN** every knockout match has a consistent pick
- **THEN** completeness is complete and exactly one predicted champion is derivable (the predicted winner of the Final)

### Requirement: Pure, framework-agnostic model

The system SHALL expose prediction construction, editing, and validation as pure functions over the bracket and prediction data, with no UI, network, or storage dependencies, so the same model can be reused by scoring, the model-comparison layer, and the predictor UI. Persistence of a prediction is explicitly out of scope for this capability.

#### Scenario: Editing is pure

- **WHEN** a pick or clear is applied to a prediction
- **THEN** the operation returns the resulting prediction state deterministically without performing any I/O

#### Scenario: No storage coupling

- **WHEN** the prediction model is used
- **THEN** it neither reads nor writes any persistent store; how a prediction is saved is left to the consumer

### Requirement: Per-match locking on decided results

The system SHALL determine editability **per knockout match** from the tournament snapshot. A match SHALL remain editable — accepting picks and clears — until its own result is decided, i.e. while its fixture is `scheduled` **or** `live`/in-progress. A match SHALL be treated as **decided** only when its fixture is `complete` with a derivable winner; once decided, the match SHALL be locked: its pick SHALL default to the real winner from the data and any modification SHALL be rejected (it stays decided). A decided match's real winner SHALL advance as the participant of the match it feeds, so downstream participants reflect reality rather than an earlier prediction. Editability SHALL be derived per match from the snapshot — never from a single global flag or wall-clock — so deciding one match SHALL NOT lock the others. If a completed fixture has no derivable winner (e.g. decided on penalties not encoded in the score), the match SHALL be treated as not-yet-decided and stay editable.

#### Scenario: A live match is still editable

- **WHEN** a knockout match has kicked off but its fixture is not yet `complete`
- **THEN** the prediction still accepts a pick or a change for that match

#### Scenario: A decided match locks to the real winner

- **WHEN** a knockout match's fixture is `complete` with a derivable winner
- **THEN** that match's pick defaults to the real winner and any modification to it is rejected, leaving it unchanged

#### Scenario: Deciding one match leaves the others editable

- **WHEN** one knockout match is decided while others are not
- **THEN** the not-decided matches still accept picks and clears

#### Scenario: A decided winner advances downstream

- **WHEN** a match is decided
- **THEN** its real winner is the participant feeding the next match, and any prior prediction that contradicts it is cleared

