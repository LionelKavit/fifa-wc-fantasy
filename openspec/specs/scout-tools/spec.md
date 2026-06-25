# scout-tools Specification

## Purpose
TBD - created by archiving change scout-agent. Update Purpose after archive.
## Requirements
### Requirement: Engine-backed tool definitions

The system SHALL define tools the model can call to obtain grounded facts: at minimum, resolving a team or group by natural-language name, retrieving a team situation, retrieving a group situation, and retrieving advancement probabilities. Each tool's input schema SHALL be explicit and validated.

#### Scenario: Tools cover the core questions

- **WHEN** the Scout needs qualification facts
- **THEN** tools exist to resolve a team/group by name and to return that team's or group's grounded situation, including advancement probability

#### Scenario: Tool inputs are schema-validated

- **WHEN** the model calls a tool with arguments
- **THEN** the arguments are validated against the tool's input schema before execution, and an invalid call returns a tool error rather than throwing

### Requirement: Tools return grounded facts only

Tool execution SHALL be implemented by the grounding layer over a `TournamentSnapshot`, returning structured situations/probabilities — never free-text the model could mistake for its own computation.

#### Scenario: Tool output is engine-sourced

- **WHEN** a Scout tool executes
- **THEN** its result is derived from the engine/grounding layer for the current snapshot, not fabricated or estimated by the model

#### Scenario: Unknown team handled

- **WHEN** the model asks for a team name that does not resolve
- **THEN** the tool returns a not-found result the model can relay, rather than guessing a team

### Requirement: Name resolution is forgiving

The team/group resolution tool SHALL match common names, abbreviations, and minor variations to the correct squad where unambiguous.

#### Scenario: Common name resolves

- **WHEN** the user refers to a team by a common name or abbreviation (e.g. "USA", "Korea")
- **THEN** the resolver returns the matching squad

