## ADDED Requirements

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
