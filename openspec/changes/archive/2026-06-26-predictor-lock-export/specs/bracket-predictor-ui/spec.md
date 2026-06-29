## ADDED Requirements

### Requirement: Finalize and export the bracket

The predictor SHALL let the user finalize ("lock") their picks and export the bracket so they can submit it in their own pool. Export SHALL offer two formats: a **CSV** listing the picks (round, match, picked team) and the **shareable image card** (`predictor-share-card`). Exported content SHALL reflect the user's current picks (and, for the image, the current evaluation), so what is downloaded matches what the predictor shows. The finalize action is user-driven and distinct from the tournament-kickoff read-only lock.

#### Scenario: Finalize then export

- **WHEN** the user finalizes their bracket
- **THEN** they are offered CSV and image-card export options

#### Scenario: CSV reflects the picks

- **WHEN** the user downloads the CSV
- **THEN** it lists their picks (round, match, picked team) matching the on-screen bracket

#### Scenario: Image card offered

- **WHEN** the user chooses the image export
- **THEN** the shareable card for the current bracket is produced

#### Scenario: Export matches the predictor

- **WHEN** an export is produced
- **THEN** its picks (and the card's figures) match the predictor's current bracket and evaluation

#### Scenario: Finalize is not the tournament lock

- **WHEN** the user finalizes before the knockouts start
- **THEN** they may still go back and edit, then re-export (finalize is a commit-and-export step, not the irreversible tournament-kickoff lock)
