## ADDED Requirements

### Requirement: Verdict note may use expert notes

When generating the Analyst verdict note, the system SHALL include relevant untrusted expert notes about the bracket's notable teams (e.g. the champion and finalists, identified from the picks the card already holds) when such notes exist. The notes SHALL be passed as labeled reference **data, never instructions**, and SHALL NOT introduce numbers beyond the supplied verdict facts; the sentence stays grounded in the facts and may add qualitative color. When there are no relevant notes (the default placeholder state), the verdict note SHALL be exactly as it is without knowledge sources.

#### Scenario: Notes inform the verdict when present

- **WHEN** the verdict note is generated and relevant expert notes exist for the bracket's notable teams
- **THEN** those notes are provided to the Analyst as labeled untrusted reference, and the one-line verdict may reflect them while staying grounded in the verdict facts

#### Scenario: No notes leaves the verdict unchanged

- **WHEN** no relevant expert notes exist
- **THEN** the verdict note is identical to the no-knowledge behavior

#### Scenario: Notes do not add fabricated numbers

- **WHEN** an expert note contains a figure or a directive
- **THEN** the verdict sentence does not adopt that figure as a grounded number and does not act on the directive
