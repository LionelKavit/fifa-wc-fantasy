# live-tournament-state Specification

## Purpose
TBD - created by archiving change live-updates. Update Purpose after archive.
## Requirements
### Requirement: Live match detection and refresh cadence

The system SHALL detect in-progress (live) fixtures from the feed and, while any fixture is live, refresh the cached tournament data on a short cadence so live score changes are reflected quickly; when no fixture is live it SHALL use the normal (longer) cadence.

#### Scenario: Fast refresh during live windows

- **WHEN** at least one fixture is live
- **THEN** the cached data is refreshed on a short live cadence rather than the normal TTL

#### Scenario: Normal cadence when idle

- **WHEN** no fixture is live
- **THEN** the system uses the normal refresh cadence and does not poll the feed more often than usual

#### Scenario: Endpoints not hammered

- **WHEN** refreshing during a live window
- **THEN** requests are still served from a server-side cache between refreshes, so the upstream feed is fetched at a bounded rate

### Requirement: Live-folded standings and situations

When a fixture is in progress, the system SHALL fold its current scoreline into the group standings (provisional), mark the standings and the affected fixtures as live, and reflect the live state in the situation narration.

#### Scenario: Live score moves the table

- **WHEN** a group has a fixture in progress with a current scoreline
- **THEN** the group's standings reflect that scoreline and are flagged provisional/live

#### Scenario: Live fixtures identifiable

- **WHEN** a situation is built during a live window
- **THEN** the in-progress fixtures and their current scores are identifiable in the output

#### Scenario: Narration reflects the live state

- **WHEN** a team's live result would change its standing
- **THEN** the narration describes the current live state (e.g. "as it stands") rather than treating the match as unplayed

### Requirement: Live-conditioned advancement probabilities

The system SHALL simulate in-progress matches starting from their current scoreline rather than from 0–0, so advancement probabilities reflect the live state.

#### Scenario: Current lead reflected in odds

- **WHEN** a team is currently leading a live match
- **THEN** its advancement probability accounts for that lead (it is at least as favorable as an equivalent not-yet-started match)

#### Scenario: Completed and not-started matches unaffected

- **WHEN** a match is already complete or has not started
- **THEN** its handling is unchanged (completed counts as final; not-started is sampled from 0–0)

### Requirement: Live state exposed to clients

The system SHALL expose, via the API, which fixtures are currently live and their current scores, so the UI can indicate live matches and decide when to refresh.

#### Scenario: Live state available

- **WHEN** the client requests tournament data during a live window
- **THEN** the response indicates which fixtures are live and their current scores

