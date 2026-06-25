## ADDED Requirements

### Requirement: Cached tournament data provider

The system SHALL provide a server-side accessor that returns the current `TournamentSnapshot` and a precomputed advancement report, caching both with a short TTL so the Monte Carlo simulation does not run on every request.

#### Scenario: Report computed once and reused within TTL

- **WHEN** tournament data is requested repeatedly within the cache TTL
- **THEN** the snapshot and advancement report are served from cache without re-fetching or re-simulating

#### Scenario: Refresh after TTL

- **WHEN** the cache has expired and data is requested
- **THEN** the snapshot is reloaded and the advancement report recomputed

### Requirement: List groups endpoint

The system SHALL expose a read endpoint returning the 12 groups with their ordered standings and each team's advancement status.

#### Scenario: Groups returned

- **WHEN** the groups endpoint is requested
- **THEN** it returns all 12 groups, each with an ordered table and per-team advancement status, as JSON

### Requirement: Group situation endpoint

The system SHALL expose a read endpoint returning a single group's grounded situation, including per-team verdict, required results, advancement probability, and narration.

#### Scenario: Valid group returns its situation

- **WHEN** the situation endpoint is requested for a valid group id
- **THEN** it returns that group's grounded situation as JSON

#### Scenario: Unknown group rejected

- **WHEN** the situation endpoint is requested for an unknown group id
- **THEN** it responds with a client error status rather than a server error

### Requirement: Server-only data access

Data endpoints SHALL run server-side and SHALL NOT expose any credential or the Anthropic client to the browser.

#### Scenario: No secrets in responses

- **WHEN** a data endpoint responds
- **THEN** the response contains only public tournament/qualification data and no credentials
