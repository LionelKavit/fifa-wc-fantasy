## MODIFIED Requirements

### Requirement: Team strength and head-to-head tool

The system SHALL provide a Scout tool that resolves one or two teams by name and returns grounded strength facts: each team's rating-based strength and deep-run odds, and — for two teams — the model's head-to-head win probability. For a two-team comparison it SHALL also return the concrete model **drivers** behind that probability: each team's **Elo rating** and its **strength multiplier** (the mean-≈1 Poisson input the Elo maps to). This lets the Scout answer "who's better, X or Y?", "I don't know these teams", and "why is X favoured?" with engine numbers rather than opinion.

#### Scenario: Compare two teams

- **WHEN** the user asks who is more likely to win between two named teams
- **THEN** the tool returns the head-to-head win probability for that pairing from the model

#### Scenario: Drivers behind the head-to-head

- **WHEN** two teams are compared
- **THEN** the tool also returns each team's Elo rating and strength multiplier, so the favouritism can be explained from the actual model inputs

#### Scenario: Single-team strength

- **WHEN** the user asks how strong a team is or how far it is likely to go
- **THEN** the tool returns that team's rating-based standing and deep-run odds

#### Scenario: Forgiving name resolution

- **WHEN** the user names a team by a common name or abbreviation
- **THEN** the tool resolves it to the correct squad, or returns a not-found result rather than guessing
