## ADDED Requirements

### Requirement: Mainstream export formats (CSV, PNG, PDF)

The predictor's export SHALL offer three formats, each in a familiar bracket-pool style: a **CSV** picks sheet, a **PNG** image card, and a **PDF** picks sheet. Each SHALL reflect the current picks and download as a file.

- **CSV**: columns `Round, Matchup, Pick` — readable team names, ordered Round of 32 → Final, with the champion identified — the layout pool trackers expect (not internal match ids).
- **PNG**: the share card image (`predictor-share-card`), downloaded as a `.png`.
- **PDF**: a clean, printable picks sheet grouped by round (the mainstream printable-bracket style), generated client-side.

#### Scenario: CSV in pool format

- **WHEN** the user downloads the CSV
- **THEN** it lists `Round, Matchup, Pick` with readable team names ordered R32→Final and the champion identified

#### Scenario: PDF picks sheet

- **WHEN** the user downloads the PDF
- **THEN** a printable picks sheet grouped by round is downloaded as a `.pdf` file, reflecting the on-screen picks

#### Scenario: PNG download

- **WHEN** the user chooses the image card
- **THEN** the card downloads as a `.png` file

#### Scenario: Exports match the bracket

- **WHEN** any export is produced
- **THEN** its picks match the predictor's current bracket
