## ADDED Requirements

### Requirement: Minimal future-round slots

Knockout slots whose participant is not yet determined (later-round matches awaiting picks or results) SHALL render as quiet, empty slots — not verbose "Winner of M.. (X v Y)" labels. A slot SHALL show a team only once it is determined (by the fan's pick of the feeding match, a model projection, or a real result); otherwise it reads as an empty placeholder that is easy to scan past.

#### Scenario: Undetermined later-round slot is blank

- **WHEN** a later-round match has no determined participant for a slot
- **THEN** that slot renders as an empty/quiet placeholder, without a verbose feeder description

#### Scenario: Slot fills when determined

- **WHEN** the fan picks the feeding match (or a projection/result determines it)
- **THEN** the dependent slot shows that team

### Requirement: Leaderboard-style scorecard

The predictor's score panel SHALL be presented as a recognizable bracket-pool **scorecard / standings card**: a prominent hero figure (the projected score) with rank-style framing, and clearly labelled, scannable rows for the key figures (score, still-alive, boldness, upset bonus, champion). The layout SHALL make it immediately legible as "your standing in a pool" rather than a generic stats grid.

#### Scenario: Hero figure stands out

- **WHEN** the scorecard renders
- **THEN** the headline figure (projected score) is visually dominant, with the supporting figures clearly subordinate and labelled

#### Scenario: Reads as a pool scorecard

- **WHEN** a user familiar with bracket pools sees the panel
- **THEN** it presents like a standings/scorecard (clear ranked hero + labelled rows), not an undifferentiated grid of numbers

### Requirement: Legible, high-contrast predictor UI

The predictor surface SHALL be legible and easy on the eyes: sufficient text/background contrast, clear visual hierarchy, and adequate spacing. Dimming/low-contrast treatment SHALL be reserved for genuinely inactive or secondary elements, not active content the user needs to read.

#### Scenario: Active content is readable

- **WHEN** the predictor renders its picks, odds, and scorecard
- **THEN** the active text and controls have comfortable contrast against the background and are easy to read

#### Scenario: Only inactive elements are dimmed

- **WHEN** an element is genuinely inactive (e.g. an empty future slot, a disabled action)
- **THEN** it may be dimmed; active content is not
