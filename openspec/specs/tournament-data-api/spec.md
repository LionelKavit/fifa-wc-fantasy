# tournament-data-api Specification

## Purpose
TBD - created by archiving change web-api. Update Purpose after archive.
## Requirements
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

### Requirement: Bracket endpoint

The system SHALL expose a read endpoint returning the current knockout bracket (structure, per-match slots/feeders with resolved teams or placeholders, and any decided winners) together with baseline per-team odds (champion probability) and Round-of-32 matchup win probabilities, so the client can render the bracket, show pre-pick win probabilities, and flag upsets without running the simulation. (Per-pick model probabilities for a specific prediction are returned by the prediction-evaluation endpoint.) The result SHALL be served via the cached tournament-data provider.

#### Scenario: Bracket returned with odds

- **WHEN** the bracket endpoint is requested
- **THEN** it returns the knockout bracket (matches, slots, resolved teams or placeholders, winners), per-team champion odds, and Round-of-32 win probabilities, as JSON

#### Scenario: Served from cache within TTL

- **WHEN** the bracket endpoint is requested repeatedly within the cache TTL
- **THEN** the bracket and baseline odds are served from cache without re-simulating

### Requirement: Prediction-evaluation endpoint

The system SHALL expose an endpoint that accepts a submitted prediction (the fan's picks) and returns its evaluation: per-pick status and points (`bracket-prediction-scoring`) and the model comparison — per-pick model probability, per-round survival, contrarian totals, and divergence (`prediction-model-comparison`). The simulation SHALL run server-side, never in the browser.

#### Scenario: Prediction scored and compared

- **WHEN** a valid prediction is posted to the evaluation endpoint
- **THEN** it returns the per-pick statuses, scores, per-pick model probabilities, survival per round, contrarian totals, and divergence, as JSON

#### Scenario: Invalid prediction rejected

- **WHEN** a prediction with picks that are not valid participants (or references unknown matches) is posted
- **THEN** the endpoint rejects it with an error rather than returning a misleading score

#### Scenario: Simulation stays server-side

- **WHEN** the client needs scoring or comparison
- **THEN** it obtains them from this endpoint; the Monte Carlo simulation is not executed in the browser

