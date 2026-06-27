## ADDED Requirements

### Requirement: Matchup shorthand verdict

When the user sends a bare matchup in the form `X vs Y` (two team names/abbreviations), the Analyst SHALL interpret it as a request for a quick verdict of that matchup and reply with one short, grounded line — who is favoured and the model's head-to-head probability — using the team head-to-head tool. No extra preamble.

#### Scenario: Bare matchup returns a verdict

- **WHEN** the user types "NED vs MAR" (or similar two-team shorthand)
- **THEN** the Analyst returns a one-line verdict naming the favoured team and its head-to-head probability, grounded in the model

#### Scenario: Unknown team in shorthand

- **WHEN** one side of the shorthand does not resolve to a team
- **THEN** the Analyst says it can't find that team rather than guessing
