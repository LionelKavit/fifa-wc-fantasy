## ADDED Requirements

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
