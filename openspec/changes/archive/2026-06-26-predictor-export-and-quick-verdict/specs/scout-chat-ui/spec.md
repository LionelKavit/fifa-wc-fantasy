## ADDED Requirements

### Requirement: Quick matchup-verdict suggestion

The Analyst chat SHALL offer a suggested prompt that teaches the quick-verdict shortcut — e.g. `Just type "NED vs MAR"` — so a user learns they can type a bare matchup to get a fast verdict. Selecting it SHALL send a matchup query that returns a brief verdict.

#### Scenario: Quick-verdict suggestion shown

- **WHEN** the Analyst chat shows its suggestions (Knockouts tab)
- **THEN** one suggestion teaches the `X vs Y` shortcut for a quick matchup verdict

#### Scenario: Selecting it asks for a verdict

- **WHEN** the user selects the quick-verdict suggestion
- **THEN** a matchup query is sent and the Analyst replies with a brief verdict
