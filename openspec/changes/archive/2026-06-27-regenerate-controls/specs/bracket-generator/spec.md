## MODIFIED Requirements

### Requirement: Deterministic generation

Generation SHALL be deterministic in the seed: identical inputs (risk level, pool size, field, probabilities, seed) SHALL produce an identical bracket. The seed SHALL introduce **bounded variety** into which upsets are selected — small enough that round ordering and any favor/fade bias still dominate (deeper-round and signalled upsets remain preferred) — so different seeds may yield different brackets while the same seed always reproduces the same one.

#### Scenario: Repeatable under a fixed seed

- **WHEN** the generator runs twice with the same inputs and seed
- **THEN** it returns identical picks

#### Scenario: Variety stays within bounds

- **WHEN** the seed varies
- **THEN** clearly higher-value upsets (deeper rounds) and favor/fade-biased upsets are still preferred; only near-equal choices are reshuffled

## ADDED Requirements

### Requirement: Seeded generation for variety

The generate endpoint and its server helper SHALL accept an optional seed and pass it to the engine generator, so callers can request a different bracket at the same risk and pool size (the engine is already deterministic given a seed). When no seed is supplied, behavior SHALL be unchanged. An invalid seed SHALL be rejected or ignored without failing an otherwise valid request.

#### Scenario: Different seeds give different brackets

- **WHEN** the endpoint is called twice with the same pool size and risk but different seeds
- **THEN** it may return different valid brackets

#### Scenario: Same seed is reproducible

- **WHEN** the endpoint is called twice with the same pool size, risk, and seed
- **THEN** it returns the same bracket

#### Scenario: Omitted seed is unchanged

- **WHEN** no seed is supplied
- **THEN** generation behaves exactly as before
