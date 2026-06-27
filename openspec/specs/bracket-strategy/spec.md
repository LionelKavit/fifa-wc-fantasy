# bracket-strategy Specification

## Purpose
TBD - created by archiving change bracket-strategy-advice. Update Purpose after archive.
## Requirements
### Requirement: Pool-fit assessment

The system SHALL assess a prediction's overall riskiness — how chalk (favourite-heavy) versus bold (upset-heavy) it is — and judge its fit for a given pool size, on the principle that **smaller pools reward safer brackets and larger pools reward more differentiation**. The assessment SHALL be derived from the model evaluation (per-pick boldness and odds) and SHALL be a pure function of the prediction, the evaluation, and the pool size.

#### Scenario: Chalk bracket flagged for a large pool

- **WHEN** a near-all-favourites bracket is assessed for a large pool
- **THEN** the assessment indicates it is too safe to likely win and recommends adding differentiation

#### Scenario: Over-bold bracket flagged for a small pool

- **WHEN** a heavily-upset bracket is assessed for a small pool
- **THEN** the assessment indicates it is riskier than needed and recommends dialing back

#### Scenario: Pure and deterministic

- **WHEN** the assessment is computed twice for the same prediction, evaluation, and pool size
- **THEN** it returns the same result, with no I/O

### Requirement: Ranked swap suggestions

The system SHALL produce a bounded, ranked list of concrete swap suggestions that move the bracket toward a better fit for the pool: for a too-safe bracket, replacing low-differentiation favourite picks with high-upside underdogs; for an over-risky bracket, reverting low-value upset picks to favourites. Each suggestion SHALL name the match, the pick to drop, the pick to take, and a grounded rationale (the model's probabilities and the expected/contrarian impact). Suggestions SHALL only propose valid participants for the affected match.

#### Scenario: Suggests differentiating swaps for a chalk bracket

- **WHEN** a too-safe bracket is analysed for a large pool
- **THEN** the system returns swaps that replace safe picks with high-upside underdogs, each with the model probabilities and expected upset payoff

#### Scenario: Each suggestion is concrete and valid

- **WHEN** a swap suggestion is produced
- **THEN** it identifies the match, the team to drop and the team to take, with a rationale, and the proposed team is a valid participant of that match

#### Scenario: Bounded and ranked

- **WHEN** suggestions are produced
- **THEN** they are a small ranked set (best first), not an exhaustive list

#### Scenario: Nothing to suggest

- **WHEN** the bracket already fits the pool well
- **THEN** the system returns an empty (or "looks well-balanced") result rather than forcing a swap

