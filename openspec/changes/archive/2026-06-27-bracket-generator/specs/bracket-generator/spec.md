## ADDED Requirements

### Requirement: Generate a complete bracket from risk and pool size

The system SHALL generate a complete, feasible prediction (every knockout match picked) from a risk level (`safe`, `balanced`, or `bold`), a pool size, the bracket's field, and the model's head-to-head probabilities. The bracket SHALL be feasible: every later-round pick is one of the winners the generated bracket sends to that match.

#### Scenario: Output is complete and feasible

- **WHEN** the generator runs for any risk level and pool size
- **THEN** it returns a pick for every knockout match, and every later-round pick is a winner of one of that match's feeder picks

#### Scenario: Safe is essentially chalk

- **WHEN** the generator runs at the `safe` risk level
- **THEN** it picks the model's favorite at (nearly) every match, with no or minimal upsets

### Requirement: Boldness scales with risk and pool size

The number and depth of upsets the generator introduces SHALL increase with the risk level and with the pool size. Bolder settings and larger pools SHALL take more upsets and reach deeper rounds; `bold` SHALL be willing to pick a non-favorite champion, while `safe` SHALL keep the favorite to win.

#### Scenario: Bolder takes more upsets

- **WHEN** brackets are generated for the same pool size at `safe`, `balanced`, and `bold`
- **THEN** the count of head-to-head underdog picks is non-decreasing from `safe` to `balanced` to `bold`, and strictly greater at `bold` than at `safe`

#### Scenario: Larger pools lean bolder

- **WHEN** brackets are generated at the same risk level for a small pool and a large pool
- **THEN** the larger pool's bracket takes at least as many upsets as the small pool's

#### Scenario: Bold can crown an underdog

- **WHEN** the generator runs at `bold` for a large pool
- **THEN** the champion pick may be a head-to-head underdog, whereas `safe` keeps the favorite as champion

### Requirement: Upsets are grounded by value, not random

The upsets the generator introduces SHALL be chosen by value rather than at random: value = the match's round weight × the upset multiplier × the underdog's win probability (the Phase 1 scoring scheme), considering only real underdogs (those whose multiplier is at least 2). Higher-value upsets SHALL be preferred over lower-value ones for a given budget.

#### Scenario: Higher-value upsets are preferred

- **WHEN** the budget admits one upset and two underdog opportunities exist with clearly different value
- **THEN** the generator takes the higher-value upset

#### Scenario: Coin-flip non-upsets are not spent on

- **WHEN** a candidate "underdog" is close enough to even that its multiplier is 1 (no bonus)
- **THEN** the generator does not count it as an upset worth spending budget on

### Requirement: Deterministic generation

Generation SHALL be deterministic: identical inputs (risk level, pool size, field, probabilities, seed) SHALL produce an identical bracket. Randomness SHALL only break ties between equal-value choices.

#### Scenario: Repeatable under a fixed seed

- **WHEN** the generator runs twice with the same inputs and seed
- **THEN** it returns identical picks

### Requirement: Risk recommendation from pool size

The system SHALL provide a pure recommendation that maps a pool size to a suggested risk level with a one-line rationale: small pools lean safer (chalk usually wins), larger pools lean bolder (differentiation is needed to win).

#### Scenario: Small pool recommends safer

- **WHEN** the recommendation is computed for a small pool
- **THEN** it suggests a safer risk level with a short rationale

#### Scenario: Large pool recommends bolder

- **WHEN** the recommendation is computed for a large pool
- **THEN** it suggests a bolder risk level with a short rationale

### Requirement: Generate endpoint

The system SHALL expose a server endpoint that accepts a pool size and a risk level and returns the generated picks, computed server-side using the grounded model. Malformed requests SHALL receive a client-error response.

#### Scenario: Generates picks for a valid request

- **WHEN** the endpoint receives a valid pool size and risk level
- **THEN** it returns a complete set of picks as `[matchId, teamId]` pairs

#### Scenario: Malformed request rejected

- **WHEN** the endpoint receives a missing or invalid risk level or pool size
- **THEN** it responds with a client-error status
