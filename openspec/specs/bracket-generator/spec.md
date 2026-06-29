# bracket-generator Specification

## Purpose
TBD - created by archiving change bracket-generator. Update Purpose after archive.
## Requirements
### Requirement: Generate a complete bracket from risk and pool size

The system SHALL generate a complete, feasible prediction (every knockout match picked) from a risk level (`safe`, `balanced`, or `bold`), a pool size, the bracket's field, and the model's head-to-head probabilities. The bracket SHALL be feasible: every later-round pick is one of the winners the generated bracket sends to that match.

#### Scenario: Output is complete and feasible

- **WHEN** the generator runs for any risk level and pool size
- **THEN** it returns a pick for every knockout match, and every later-round pick is a winner of one of that match's feeder picks

#### Scenario: Safe is essentially chalk

- **WHEN** the generator runs at the `safe` risk level
- **THEN** it picks the model's favorite at (nearly) every match, with no or minimal upsets

### Requirement: Boldness scales with risk and pool size

The number and depth of upsets the generator introduces SHALL increase with the risk level and with the pool size. Bolder settings and larger pools SHALL take more upsets and reach deeper rounds; `bold` SHALL be willing to pick a non-favorite champion, while `safe` SHALL keep the favorite to win. When **completing a bracket from existing picks**, the boldness budget SHALL be measured over the whole bracket: the generator SHALL count the upsets already present among the existing picks and spend only the **remaining** budget on the unset matches, so the completed bracket as a whole honors the risk/pool target. It SHALL NEVER remove or override an existing pick to meet the budget; if the existing upsets already meet or exceed the budget, the unset matches SHALL be filled with favorites.

#### Scenario: Bolder takes more upsets

- **WHEN** brackets are generated from scratch for the same pool size at `safe`, `balanced`, and `bold`
- **THEN** the count of head-to-head underdog picks is non-decreasing from `safe` to `balanced` to `bold`, and strictly greater at `bold` than at `safe`

#### Scenario: Larger pools lean bolder

- **WHEN** brackets are generated from scratch at the same risk level for a small pool and a large pool
- **THEN** the larger pool's bracket takes at least as many upsets as the small pool's

#### Scenario: Bold can crown an underdog

- **WHEN** the generator runs from scratch at `bold` for a large pool
- **THEN** the champion pick may be a head-to-head underdog, whereas `safe` keeps the favorite as champion

#### Scenario: Existing upsets count toward the budget

- **WHEN** the generator completes a partial bracket that already contains one or more upset picks
- **THEN** it adds at most the remaining budget of upsets in the unset matches (existing upsets count toward the risk/pool target) and never changes an existing pick

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

### Requirement: Risk recommendation from pool size

The system SHALL provide a pure recommendation that maps a pool size to a suggested risk level with a one-line rationale: small pools lean safer (chalk usually wins), larger pools lean bolder (differentiation is needed to win).

#### Scenario: Small pool recommends safer

- **WHEN** the recommendation is computed for a small pool
- **THEN** it suggests a safer risk level with a short rationale

#### Scenario: Large pool recommends bolder

- **WHEN** the recommendation is computed for a large pool
- **THEN** it suggests a bolder risk level with a short rationale

### Requirement: Generate endpoint

The system SHALL expose a server endpoint that accepts a pool size, a risk level, and **optionally the user's current picks**, and returns the generated picks, **completed from the current picks** server-side using the grounded model. An absent or empty picks set SHALL yield a full from-scratch bracket. Malformed requests SHALL receive a client-error response.

#### Scenario: Generates picks for a valid request

- **WHEN** the endpoint receives a valid pool size and risk level with no current picks
- **THEN** it returns a complete set of picks as `[matchId, teamId]` pairs (a full from-scratch bracket)

#### Scenario: Completes from current picks

- **WHEN** the endpoint receives a valid pool size and risk level together with the user's current (partial) picks
- **THEN** it returns a complete bracket that keeps those picks and fills only the unset matches

#### Scenario: Malformed request rejected

- **WHEN** the endpoint receives a missing or invalid risk level or pool size
- **THEN** it responds with a client-error status

### Requirement: Optional expert signal bias

The generator SHALL accept optional expert signals — a set of **favored** teams and a set of **faded** teams — and use them to deterministically bias which upsets the boldness budget is spent on, without changing its other guarantees (complete, feasible, monotonic boldness, deterministic). A favored team SHALL be biased toward being taken as an upset where it is the underdog; a faded team SHALL be biased toward being upset where it is the favorite. When both signal sets are empty, the generated bracket SHALL be identical to the no-signals result. Signals SHALL only re-order/weight choices among real candidates — they SHALL NOT force an infeasible pick or fabricate probabilities.

#### Scenario: No signals is unchanged

- **WHEN** the generator runs with empty favored and faded sets
- **THEN** it returns exactly the bracket it would produce without signals

#### Scenario: A favored underdog is preferred

- **WHEN** two upsets are otherwise comparable for the budget and one involves a favored team
- **THEN** the generator prefers the upset involving the favored team

#### Scenario: A faded favorite is more likely upset

- **WHEN** a faded team is the favorite in a match and an upset there is a real candidate
- **THEN** that match is biased toward being taken as an upset within the budget

#### Scenario: Signals never break feasibility or determinism

- **WHEN** signals are applied
- **THEN** the bracket remains complete and feasible, and the same inputs + seed + signals reproduce the same bracket

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

### Requirement: Marginal reach probabilities as a generation input

The generator SHALL accept per-team **marginal stage-win probabilities** (the probability a team wins a match at each knockout stage in reality — equivalently, reaches the next stage) and use them as the plausibility term of the selection value. These probabilities are a deterministic input supplied by the caller (server-side, from the engine's deep-run odds). When they are absent, the generator MAY fall back to its prior conditional weighting, but the grounded path SHALL be used in the application.

#### Scenario: Plausibility uses the compounded probability

- **WHEN** marginal reach probabilities are supplied
- **THEN** a candidate upset's plausibility is its underdog's marginal probability of winning that match (which compounds down with depth), not the single-match conditional probability

#### Scenario: Deterministic given the supplied probabilities

- **WHEN** the same prediction inputs, seed, and marginal probabilities are provided twice
- **THEN** the generated bracket is identical

### Requirement: Complete a bracket from existing picks

The generator SHALL accept an optional set of already-made picks (a partial, path-consistent prediction) and produce a complete bracket that **keeps every valid existing pick and decides only the unset matches**. An existing pick SHALL be kept when its team is a valid participant of that match given the resolved upstream; an existing pick that is not a valid participant (stale or inconsistent) SHALL be ignored and that match decided normally, so the bracket stays feasible. With no existing picks supplied, the result SHALL be identical to generating from scratch. The output SHALL remain complete, feasible, and deterministic given the inputs, seed, and existing picks.

#### Scenario: Existing picks are preserved

- **WHEN** the generator completes a bracket that already has some picks
- **THEN** every valid existing pick is unchanged and only the previously-unset matches are newly decided

#### Scenario: Empty input equals from-scratch

- **WHEN** no existing picks are supplied
- **THEN** the output is identical to the from-scratch generation for the same inputs and seed

#### Scenario: Invalid existing pick is ignored

- **WHEN** an existing pick names a team that cannot be a participant of its match given the upstream
- **THEN** that match is decided normally rather than forced, and the bracket stays feasible

