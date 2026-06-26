## MODIFIED Requirements

### Requirement: Poisson scoreline sampling model

The system SHALL sample each remaining fixture's scoreline by drawing each team's goals from an independent Poisson distribution whose rate derives from per-team strength plus a home-advantage term, and SHALL expose this outcome model behind an injectable interface so it can be replaced without changing the simulation loop. Per-team strength SHALL be derived from the ingested team strength ratings (Elo) when available, so stronger teams have a higher scoring rate and matchups reflect real disparities; when a team has no rating, it SHALL fall back to a neutral baseline. The home-advantage term SHALL apply only to a host nation playing on home soil (the WC 2026 hosts), since all other matches are effectively at neutral venues.

#### Scenario: Goals drawn from Poisson

- **WHEN** a remaining fixture is sampled
- **THEN** each side's goal count is a non-negative integer drawn from a Poisson distribution parameterized by that side's rate

#### Scenario: Strength derived from ratings

- **WHEN** team strength ratings are available and two teams of clearly different rating meet
- **THEN** the higher-rated team has a higher expected scoring rate, so its modelled win probability materially exceeds an even split

#### Scenario: Neutral fallback without a rating

- **WHEN** no strength rating is available for a team
- **THEN** that team uses a neutral baseline strength so the model introduces no team-specific bias for it beyond home advantage

#### Scenario: Home advantage only for hosts at home

- **WHEN** a match involves a host nation playing in its own country
- **THEN** the home-advantage term is applied to that host; for all other matches no home-advantage term is applied

#### Scenario: Model is injectable

- **WHEN** an alternative outcome model is supplied
- **THEN** the simulation uses it without other code changes
