## MODIFIED Requirements

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
