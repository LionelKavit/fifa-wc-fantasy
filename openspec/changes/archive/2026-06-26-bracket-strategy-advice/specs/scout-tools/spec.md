## ADDED Requirements

### Requirement: Bracket strategy tool

The system SHALL provide a Scout tool that, given the user's picks and pool size, returns the `bracket-strategy` output: the pool-fit assessment and the ranked swap suggestions (each naming the match, the pick to drop and take, and a grounded rationale). The tool's input SHALL be schema-validated, and its output SHALL be engine-produced, not free-text the model invents. It SHALL handle missing picks or pool size as a clear result.

#### Scenario: Returns grounded strategy

- **WHEN** the Scout needs strategic advice and picks + pool size are in context
- **THEN** the tool returns the pool-fit assessment and ranked swap suggestions from `bracket-strategy`

#### Scenario: Missing inputs handled

- **WHEN** the tool is invoked without picks or without a pool size
- **THEN** it returns a clear result indicating what's needed (e.g. "need your picks" / "how many in your pool?") rather than guessing
