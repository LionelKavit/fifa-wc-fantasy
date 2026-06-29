## MODIFIED Requirements

### Requirement: Upsets are grounded by value, not random

The upsets the generator introduces SHALL be chosen by an **expected-differentiation** value that is robust to the pool's scoring scheme, not by the system's own round-point weights. For each candidate upset the value SHALL combine:

- **Plausibility** — the *compounded* probability the upset actually comes true: the underdog's marginal probability of winning that match in reality (equivalently, reaching the next stage), which decreases as rounds progress. A deep upset is therefore only valuable when the team realistically could get there.
- **Differentiation** — how contrarian the pick is relative to the chalk-biased field (a pick the field is unlikely to have is worth more).

The system's doubling round-scoring weights (1/2/4/8/16) SHALL NOT be used in this selection value; depth SHALL influence selection only through the (lower) probability of deep upsets and the (higher) contrarianness. Only real underdogs (multiplier at least 2) SHALL be eligible candidates; the multiplier band qualifies a candidate but is not the weighting. Higher-value candidates SHALL be preferred for a given budget.

#### Scenario: A far-fetched deep upset is not chosen over a plausible one

- **WHEN** a budget admits one upset, and the choices are a very unlikely deep upset (e.g. a weak team to win the final) versus a realistically reachable earlier-round upset
- **THEN** the generator prefers the plausible earlier-round upset, because the deep upset's compounded probability is far lower

#### Scenario: Plausible deeper upsets are still allowed

- **WHEN** a team realistically could reach a deeper round (its compounded probability of winning that match is meaningful)
- **THEN** that deeper upset remains an eligible, competitive candidate

#### Scenario: Selection does not use the round-scoring weights

- **WHEN** two candidate upsets have similar plausibility and contrarianness but sit in different rounds
- **THEN** the deeper one is not preferred merely because the scoring scheme would award it more points

#### Scenario: Coin-flip non-upsets are not spent on

- **WHEN** a candidate "underdog" is close enough to even that its multiplier is 1 (no bonus)
- **THEN** the generator does not count it as an upset worth spending budget on

### Requirement: Deterministic generation

Generation SHALL be deterministic in the seed: identical inputs (risk level, pool size, field, matchup probabilities, marginal reach probabilities, seed) SHALL produce an identical bracket. The seed SHALL introduce bounded variety into which upsets are selected — small enough that clearly more plausible / more differentiating upsets remain preferred and any favor/fade bias still dominates — so different seeds may yield different brackets while the same seed always reproduces the same one.

#### Scenario: Repeatable under a fixed seed

- **WHEN** the generator runs twice with the same inputs and seed
- **THEN** it returns identical picks

#### Scenario: Variety stays within bounds

- **WHEN** the seed varies
- **THEN** clearly more plausible/differentiating upsets and favor/fade-biased upsets are still preferred; only near-equal choices are reshuffled

## ADDED Requirements

### Requirement: Marginal reach probabilities as a generation input

The generator SHALL accept per-team **marginal stage-win probabilities** (the probability a team wins a match at each knockout stage in reality — equivalently, reaches the next stage) and use them as the plausibility term of the selection value. These probabilities are a deterministic input supplied by the caller (server-side, from the engine's deep-run odds). When they are absent, the generator MAY fall back to its prior conditional weighting, but the grounded path SHALL be used in the application.

#### Scenario: Plausibility uses the compounded probability

- **WHEN** marginal reach probabilities are supplied
- **THEN** a candidate upset's plausibility is its underdog's marginal probability of winning that match (which compounds down with depth), not the single-match conditional probability

#### Scenario: Deterministic given the supplied probabilities

- **WHEN** the same prediction inputs, seed, and marginal probabilities are provided twice
- **THEN** the generated bracket is identical
