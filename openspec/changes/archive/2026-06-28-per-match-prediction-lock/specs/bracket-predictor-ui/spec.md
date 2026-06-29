## MODIFIED Requirements

### Requirement: Lock-aware editing

The predictor SHALL allow editing every knockout match that is not yet decided — including matches that are **live/in-progress** — and SHALL present only the **decided** matches as read-only, showing each decided match's real winner. There SHALL be no global read-only state and no "the knockouts have started" banner that freezes the whole bracket; deciding one match SHALL NOT disable the others. The Build box actions SHALL remain available throughout the knockouts: **autofill** SHALL complete the not-yet-decided matches while keeping decided results fixed (never contradicting a real winner), and **Clear** SHALL reset only the not-yet-decided picks (decided results persist).

#### Scenario: Editable while live or scheduled

- **WHEN** a knockout match is not yet complete (scheduled or live)
- **THEN** the fan can pick or change its winner

#### Scenario: Decided match is read-only with the real winner

- **WHEN** a knockout match is complete with a winner
- **THEN** that match is shown read-only with its real winner and cannot be changed

#### Scenario: Actions stay available once some matches are decided

- **WHEN** some knockout matches are decided and others are not
- **THEN** autofill completes the not-decided matches (keeping the decided results) and Clear clears only the not-decided picks, with no global read-only state
