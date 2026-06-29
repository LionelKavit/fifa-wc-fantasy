## ADDED Requirements

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

## MODIFIED Requirements

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
