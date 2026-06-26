## ADDED Requirements

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
