## ADDED Requirements

### Requirement: Team strength ratings ingestion

The system SHALL provide a team strength rating per World Cup team, sourced from World Football Elo ratings via an **offline ingestion step** (not a runtime fetch). The ingestion SHALL fetch the ratings, map each country to its squad id (1–48), and persist the result as a committed snapshot the engine reads. Ingestion SHALL validate that every one of the tournament's teams resolves to a rating and SHALL fail loudly if any team is missing or the source's shape has drifted, consistent with the rest of the data layer.

#### Scenario: Ratings persisted as a committed snapshot

- **WHEN** the ingestion step runs successfully
- **THEN** it writes a committed snapshot mapping each squad id to its Elo rating, which the engine reads without any runtime network call

#### Scenario: Every team is covered

- **WHEN** ingestion completes
- **THEN** every tournament team has a rating; if any team cannot be mapped to a rating, ingestion fails with a clear error rather than producing a partial snapshot

#### Scenario: Refreshed by re-running, not at request time

- **WHEN** ratings need updating (e.g. between match days)
- **THEN** the snapshot is refreshed by re-running the ingestion step, and the running app never fetches the third-party source on the request path

#### Scenario: Source drift handled

- **WHEN** the upstream ratings source returns an unexpected shape
- **THEN** ingestion reports the problem and does not overwrite the existing snapshot with malformed data
