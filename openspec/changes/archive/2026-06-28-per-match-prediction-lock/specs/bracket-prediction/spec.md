## REMOVED Requirements

### Requirement: Prediction locking at first knockout kickoff

**Reason**: A single global lock froze the entire bracket the instant any knockout match kicked off, preventing prediction of every still-undecided match. Replaced by per-match locking keyed on each match's own result.
**Migration**: See "Per-match locking on decided results" — editability is now decided per match.

## ADDED Requirements

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
