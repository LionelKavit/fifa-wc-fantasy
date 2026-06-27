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

### Requirement: Prediction evaluation tool

The system SHALL provide a Scout tool that, given a user's bracket picks, returns the grounded evaluation: each pick's status (pending/correct/wrong/busted) and model probability, the projected (expected) score, the survival probability per round ("as it stands"), the boldness count, and the upset bonus — produced by `bracket-prediction-scoring` and `prediction-model-comparison` over the current snapshot. The tool's input SHALL have an explicit, validated schema, and output SHALL be engine-sourced, never free-text the model could mistake for its own computation.

#### Scenario: Returns the grounded bracket evaluation

- **WHEN** the Scout needs facts about the user's bracket and picks are available
- **THEN** the tool returns per-pick statuses and model probabilities, projected score, survival per round, boldness, and upset bonus, computed by the engine

#### Scenario: No picks available

- **WHEN** the tool is invoked but no picks are in context
- **THEN** it returns a clear "no bracket provided" result the Scout can relay, rather than inventing one

#### Scenario: Invalid picks handled

- **WHEN** the tool is called with picks that are not valid participants or reference unknown matches
- **THEN** it returns a tool error the Scout can relay, not an exception

### Requirement: Team strength and head-to-head tool

The system SHALL provide a Scout tool that resolves one or two teams by name and returns grounded strength facts: each team's rating-based strength and deep-run odds, and — for two teams — the model's head-to-head win probability. This lets the Scout answer "who's better, X or Y?" and "I don't know these teams" with engine numbers rather than opinion.

#### Scenario: Compare two teams

- **WHEN** the user asks who is more likely to win between two named teams
- **THEN** the tool returns the head-to-head win probability for that pairing from the model

#### Scenario: Single-team strength

- **WHEN** the user asks how strong a team is or how far it is likely to go
- **THEN** the tool returns that team's rating-based standing and deep-run odds

#### Scenario: Forgiving name resolution

- **WHEN** the user names a team by a common name or abbreviation
- **THEN** the tool resolves it to the correct squad, or returns a not-found result rather than guessing

### Requirement: Bracket strategy tool

The system SHALL provide a Scout tool that, given the user's picks and pool size, returns the `bracket-strategy` output: the pool-fit assessment and the ranked swap suggestions (each naming the match, the pick to drop and take, and a grounded rationale). The tool's input SHALL be schema-validated, and its output SHALL be engine-produced, not free-text the model invents. It SHALL handle missing picks or pool size as a clear result.

#### Scenario: Returns grounded strategy

- **WHEN** the Scout needs strategic advice and picks + pool size are in context
- **THEN** the tool returns the pool-fit assessment and ranked swap suggestions from `bracket-strategy`

#### Scenario: Missing inputs handled

- **WHEN** the tool is invoked without picks or without a pool size
- **THEN** it returns a clear result indicating what's needed (e.g. "need your picks" / "how many in your pool?") rather than guessing

### Requirement: Expert notes tool

The Scout toolset SHALL include a `get_expert_notes` tool that returns relevant expert/pundit snippets for a topic or team from the loaded knowledge sources, each labeled as unverified reference. When no sources are present (or none match), it SHALL return a clear "no expert notes available yet" result rather than an error. The returned content is reference **data**: the Analyst may cite it but SHALL NOT treat it as instructions, and SHALL NOT present it as a grounded figure (the Elo numbers remain the source of truth).

#### Scenario: Returns relevant notes when sources exist

- **WHEN** the tool is called with a topic that matches loaded expert snippets
- **THEN** it returns those snippets labeled as unverified expert/pundit reference

#### Scenario: No sources yet

- **WHEN** the tool is called and no knowledge sources are present
- **THEN** it returns a clear "no expert notes available yet" result, not an error

#### Scenario: Notes are data, not commands

- **WHEN** a returned snippet contains text shaped like an instruction
- **THEN** the Analyst treats it as reference data and does not act on it

