# bracket-verdict-card Specification

## Purpose
TBD - created by archiving change bracket-verdict-card. Update Purpose after archive.
## Requirements
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

### Requirement: Persistent bracket-settings panel

The post-bracket panel SHALL be a single persistent "Your bracket settings" box that is shown regardless of the bracket's completeness (empty, partial, or complete). It SHALL contain: an approximate pool-size input, a "Choose risk level" slider (Safe ↔ Balanced ↔ Bold), an autofill action ("Build my bracket for me", labeled as a rebuild once the bracket already has picks), a picks counter (e.g. "12/31 picks made — you can edit every pick after"), and a "Clear bracket" action. The panel SHALL NOT swap to a different view when the bracket becomes complete. The Lock & Export box SHALL remain below it, gated on completeness as before.

The introductory copy SHALL read "Need help filling your bracket?" followed by "Autofill with the Analyst – then tweak any pick."

#### Scenario: Settings box persists when complete

- **WHEN** the bracket is empty, partially filled, or fully complete
- **THEN** the "Your bracket settings" box remains visible with the pool-size input, the risk slider, the build/rebuild action, and Clear bracket

#### Scenario: Action label reflects state

- **WHEN** the bracket is empty
- **THEN** the primary action reads "Build my bracket for me"; once the bracket already has picks the action presents as a rebuild

### Requirement: Pool size as an in-panel boldness input

The pool-size field SHALL appear inside the settings box (not in a header), introduced by a prompt to enter an **approximate** pool size, and SHALL default to **20**. Helper text SHALL explain that it helps the model gauge how much risk to take (it tunes how bold the autofilled bracket is) — e.g. "How many people are in your pool? Helps model measure risk." Pool size SHALL be used only to influence the autofill's boldness; it SHALL NOT drive any displayed number or verdict.

The field SHALL be a **plain text entry with no stepper/spinner arrows** and SHALL accept only a **positive integer (greater than 0)**. Any other input — empty, zero, negative, a decimal/non-integer, or non-numeric — is invalid. When the value is invalid, the field SHALL be flagged with a short message asking the user to enter a number greater than 0, and the build ("Finish my bracket" / "Build my bracket for me") button SHALL be disabled until a valid value is entered. Only a valid positive integer SHALL be applied as the pool size used by the autofill.

#### Scenario: Default and placement

- **WHEN** the settings box renders
- **THEN** the pool-size input is inside the box with an "approximate pool size" prompt and defaults to 20

#### Scenario: Plain text box, no steppers

- **WHEN** the pool-size field renders
- **THEN** it is a plain text entry without up/down spinner arrows

#### Scenario: Only positive integers accepted

- **WHEN** the user enters a whole number greater than 0
- **THEN** the value is accepted and used as the pool size, and the build button is enabled (subject to the bracket not already being complete)

#### Scenario: Invalid input flagged and build blocked

- **WHEN** the user clears the field or enters zero, a negative, a decimal, or non-numeric text
- **THEN** the field is flagged with a message asking for a number greater than 0, the invalid value is not applied as the pool size, and the build button is disabled until a valid number is entered

#### Scenario: Pool size tunes autofill only

- **WHEN** the user changes the pool size and autofills
- **THEN** the generated bracket reflects the pool size's boldness budget, and no verdict or percentage is shown as a result

### Requirement: Choose risk level without a recommendation

The settings box SHALL show a plain "Choose risk level" label above the risk slider and SHALL NOT show any pool-size-based recommendation text. The slider SHALL keep the Safe/Balanced/Bold levels and MAY indicate the currently selected level (without a "recommended" annotation).

#### Scenario: No recommendation shown

- **WHEN** the settings box renders at any pool size
- **THEN** a "Choose risk level" label is shown above the slider and no "recommended" risk text appears

### Requirement: No verdict, percentages, or Analyst note in the panel

The panel SHALL NOT display a win probability, a You-vs-the-model comparison, a projected finish, a likely-points range, or an Analyst/template verdict sentence at any point. A completed bracket SHALL leave the user with the filled bracket, the persistent settings box, and Lock & Export — and nothing else. (Any "is this good?" question is handled by the Scout chat, not this panel.)

#### Scenario: Completed bracket shows no numbers

- **WHEN** the bracket is complete
- **THEN** the panel shows no win %, finish position, points range, You-vs-model, or verdict sentence — only the settings box and the export controls

