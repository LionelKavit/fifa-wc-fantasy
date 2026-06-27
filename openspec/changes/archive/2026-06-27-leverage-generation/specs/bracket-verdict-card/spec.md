## ADDED Requirements

### Requirement: Optimize-for-win-probability generation option

The Build box SHALL offer an "Optimize for win %" option alongside the risk slider that generates the bracket with the leverage strategy instead of the heuristic. Because it is slower, choosing it SHALL show a loading state while it runs; on success it SHALL populate the editable bracket exactly like a normal generate (so the verdict re-evaluates), and on failure it SHALL show an error and leave the current bracket unchanged.

#### Scenario: Optimize produces and populates a bracket

- **WHEN** the user chooses "Optimize for win %" and runs generation
- **THEN** the leverage strategy runs (with a loading state), the resulting picks populate the editable bracket, and the verdict re-evaluates

#### Scenario: Heuristic remains the default

- **WHEN** the user generates without choosing the optimize option
- **THEN** the fast heuristic bracket is produced exactly as before

#### Scenario: Failure leaves the bracket intact

- **WHEN** an optimize run fails
- **THEN** an error is shown and the current bracket is unchanged
