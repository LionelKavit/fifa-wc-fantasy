## MODIFIED Requirements

### Requirement: Matchup shorthand verdict

When the user sends a bare matchup in the form `X vs Y` (two team names/abbreviations), the Analyst SHALL interpret it as a request for a quick verdict of that matchup and reply with one short, grounded line — who is favoured and the model's head-to-head probability — using the team head-to-head tool. No extra preamble. When the user instead asks WHY a team is favoured/stronger (or how the model decided), the Analyst SHALL explain it using the concrete model drivers from that tool — the two teams' Elo ratings and strength values — and SHALL NOT attribute favouritism to factors the model does not use (e.g. FIFA ranking, "deeper squad", form, pedigree), nor lead with the tournament win % unless that is what was asked.

#### Scenario: Bare matchup returns a verdict

- **WHEN** the user types "NED vs MAR" (or similar two-team shorthand)
- **THEN** the Analyst returns a one-line verdict naming the favoured team and its head-to-head probability, grounded in the model

#### Scenario: Why a team is favoured cites the drivers

- **WHEN** the user asks why one team is favoured over another (e.g. "why are Netherlands the favourites?")
- **THEN** the Analyst explains it by quoting the teams' Elo ratings and strength values from the head-to-head tool, without inventing factors the model does not use and without leading with the tournament win %

#### Scenario: Unknown team in shorthand

- **WHEN** one side of the shorthand does not resolve to a team
- **THEN** the Analyst says it can't find that team rather than guessing
