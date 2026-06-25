## ADDED Requirements

### Requirement: Public endpoint fetching with caching

The system SHALL fetch the FIFA WC 2026 public JSON endpoints (`players.json`, `squads.json`, `rounds.json`) from the configured base URL and cache responses with a short TTL appropriate for live score updates.

#### Scenario: Successful fetch and cache

- **WHEN** a tournament snapshot is requested and the cache is cold or expired
- **THEN** the system fetches all three endpoints over HTTPS and stores the parsed results in cache with a TTL

#### Scenario: Cache hit within TTL

- **WHEN** a tournament snapshot is requested within the cache TTL of a prior fetch
- **THEN** the system serves the cached data and performs no network request

#### Scenario: Endpoint returns non-200

- **WHEN** any endpoint responds with a non-200 status
- **THEN** the system raises a typed fetch error identifying the endpoint and status, and does not poison the cache with the failed response

### Requirement: Runtime validation tolerant of additive drift

The system SHALL validate each endpoint payload against a zod schema covering only the fields the app depends on, accepting unknown extra fields but failing loud when a required field is missing or its type changes.

#### Scenario: Payload contains unknown extra fields

- **WHEN** an endpoint payload includes fields not present in the schema
- **THEN** validation passes and the extra fields are ignored

#### Scenario: Required field missing or wrong type

- **WHEN** a required field (e.g. `squads[].group`, `players[].squadId`, fixture `homeSquadId`) is absent or has an unexpected type
- **THEN** validation fails with an error naming the endpoint and the offending field path

### Requirement: Player-to-team join via squads.json

The system SHALL join players to teams using `players[].squadId` against `squads.json` id space (1–48), and SHALL NOT use `squads_fifa.json` for this join.

#### Scenario: All players map to a team

- **WHEN** the snapshot is normalized
- **THEN** every player resolves to exactly one `Team`, and a normalization error is raised if any `squadId` has no matching squad

### Requirement: Fixture normalization from rounds

The system SHALL flatten `rounds[].tournaments[]` into a typed `Fixture` list, each carrying home/away team ids (1–48 space), a status of `complete | live | scheduled`, scores when available, and the owning round and stage.

#### Scenario: Completed fixture carries scores

- **WHEN** a tournament entry has status complete with home and away scores
- **THEN** the normalized `Fixture` has status `complete` and integer `homeScore`/`awayScore`

#### Scenario: Scheduled fixture has no scores

- **WHEN** a tournament entry has not been played
- **THEN** the normalized `Fixture` has status `scheduled` and null scores

#### Scenario: Group-stage fixtures are identifiable

- **WHEN** fixtures are normalized
- **THEN** each fixture exposes its stage (e.g. `GROUP`, `R32`) so group-stage fixtures can be filtered

### Requirement: Tournament snapshot accessor

The system SHALL expose a single `loadTournamentSnapshot()` accessor returning a consistent point-in-time view containing teams, groups (12 groups of 4, keyed a–l), players, rounds, and fixtures, built from one coherent fetch cycle.

#### Scenario: Snapshot shape

- **WHEN** `loadTournamentSnapshot()` resolves
- **THEN** it returns typed `teams` (48), `groups` (12 of 4), `players`, `rounds`, and `fixtures` collections derived from the same fetch cycle

#### Scenario: Group membership

- **WHEN** the snapshot is built
- **THEN** each team belongs to exactly one group and each group contains exactly 4 teams

### Requirement: Typed domain models as the public interface

The system SHALL expose only typed domain models (`Team`, `Group`, `Player`, `Round`, `Fixture`) to downstream consumers and SHALL keep raw endpoint shapes private to the ingestion layer.

#### Scenario: Raw shapes not leaked

- **WHEN** a downstream module imports from the data layer
- **THEN** it receives normalized domain types and has no access to raw `players.json` / `rounds.json` record shapes
