# NOTE: stacks on `declutter-bracket-panel`, which introduces these requirements.
# Archive `declutter-bracket-panel` (and `simplify-predictor-display`) before this change.

## MODIFIED Requirements

### Requirement: Generate, populate, then tweak

From the settings box, the autofill action SHALL **complete the bracket from its current state**: it SHALL keep every pick already in the bracket and fill only the unset matches with a generated prediction at the chosen risk level and pool size, populating the result into the editable bracket tree (and persisting it like manual picks) so the user can change any pick afterward. The completed bracket is a starting point, not a locked result. Because the action only fills gaps and never overwrites existing picks, it SHALL NOT ask for overwrite confirmation. No verdict is shown as a result of generating or editing.

#### Scenario: Autofill fills an empty bracket

- **WHEN** the user picks a risk level and triggers autofill on an empty bracket
- **THEN** the bracket is populated with a complete generated prediction and every pick remains editable in the tree

#### Scenario: Completion keeps existing picks

- **WHEN** the user has made one or more picks and triggers autofill
- **THEN** the existing picks are unchanged, only the previously-unset matches are filled, and no overwrite confirmation is shown

#### Scenario: Tweaks are preserved

- **WHEN** the user edits a pick after autofilling
- **THEN** the edit replaces only that pick (and clears any now-infeasible downstream picks per the existing bracket rules); completing again fills the cleared matches while keeping all other picks

### Requirement: In-place rebuild controls

The primary action SHALL **complete the bracket in place** from the persistent settings box: it completes the bracket from its current state at the current risk and pool size, keeping existing picks and filling only the gaps, without clearing first. Its label SHALL reflect the bracket's state — "Build my bracket for me" when the bracket is empty, a finish/complete label when it is partially filled — and it SHALL be disabled when the bracket is already complete (no gaps to fill). Adjusting the risk slider or pool size changes the settings used for the next completion. A fresh full bracket SHALL be produced by Clear bracket (which resets to zero picks) followed by the build action; there SHALL be no separate control that regenerates over and overrides existing picks.

#### Scenario: Action label reflects state

- **WHEN** the bracket is empty, partially filled, or complete
- **THEN** the action reads "Build my bracket for me" when empty, a finish/complete label when partial, and is disabled when complete

#### Scenario: Completion uses the current settings

- **WHEN** the user adjusts the risk slider and/or pool size and presses the action on a partially-filled bracket
- **THEN** the unset matches are filled at the current risk and pool size and the existing picks are unchanged

#### Scenario: Clear resets to zero

- **WHEN** the user clicks Clear bracket
- **THEN** all picks are removed and the bracket returns to the empty state (a subsequent build produces a fresh full bracket)

### Requirement: Rebuild feedback

A completion SHALL show a loading state while generating and an error state on failure, leaving the existing bracket in place if it fails. The completion action only fills gaps and SHALL NOT require any overwrite confirmation.

#### Scenario: Loading during a completion

- **WHEN** a completion request is in flight
- **THEN** the control shows a loading state

#### Scenario: Failure leaves the bracket intact

- **WHEN** a completion request fails
- **THEN** an error is shown and the current bracket remains unchanged
