# matchup-probability Specification

## Purpose
TBD - created by archiving change unify-probability-model. Update Purpose after archive.
## Requirements
### Requirement: Single Poisson head-to-head model

The system SHALL expose one head-to-head probability `P(A beats B)` derived from the same Poisson outcome model that drives the simulation: each team's goals are Poisson with rate `λ = baseRate × team strength × home boost` (team strength from the Elo ratings via `eloStrengths`). `P(A beats B)` SHALL be the closed form `Σ_{a>b} Pois(a;λ_A)·Pois(b;λ_B) + ½·Σ_{g} Pois(g;λ_A)·Pois(g;λ_B)` — the chance A outscores B in regulation, plus half the regulation-draw mass (the engine resolves a draw via symmetric extra time then a 50/50 shootout, so a regulation draw is a coin flip). This SHALL be the single source for every head-to-head the app shows or decides on; the Elo logistic SHALL no longer be used for head-to-heads.

#### Scenario: Head-to-head agrees with the simulation

- **WHEN** the closed-form `P(A beats B)` is compared to the Monte-Carlo matchup odds for the same pairing under the same model
- **THEN** they agree within Monte-Carlo error (the closed form is the analytic expectation of the simulated match)

#### Scenario: Complementary and bounded

- **WHEN** `P(A beats B)` is computed
- **THEN** it lies in [0, 1] and `P(A beats B) + P(B beats A) = 1`

#### Scenario: Stronger team is favored

- **WHEN** team A has a higher strength than team B in a neutral match
- **THEN** `P(A beats B) > 0.5`

### Requirement: Neutral by default, host-only home advantage

A head-to-head SHALL be computed on a **neutral** basis by default (no home boost for either side). Home advantage SHALL be applied only when a host team plays on home soil, consistent with the simulation's host-only home advantage.

#### Scenario: Neutral matchup

- **WHEN** neither team is a host playing at home
- **THEN** both rates use only base rate × strength, with no home boost

#### Scenario: Host home advantage

- **WHEN** a host team is the home side
- **THEN** its rate includes the host home boost, matching how the simulation treats that match

### Requirement: Pure and deterministic

The head-to-head SHALL be a pure function of the team strengths (and the host context) with no I/O and no randomness: identical inputs SHALL return an identical probability. It SHALL be cheap enough to call in hot loops (a bounded double sum over goal counts).

#### Scenario: Deterministic

- **WHEN** the head-to-head is computed twice for the same teams and context
- **THEN** it returns the identical probability, performing no I/O

