# bracket-predictor-ui Specification

## Purpose
TBD - created by archiving change bracket-predictor-ui. Update Purpose after archive.
## Requirements
### Requirement: Interactive bracket tree

The predictor SHALL render the knockout bracket as a tree from the Round of 32 through the Final, with each match showing its two participants (concrete teams or, for not-yet-resolved later rounds, the fan's predicted winners of the feeding matches). Clicking a participant SHALL pick it as that match's winner and advance it into the next round's slot. Picks SHALL follow the `bracket-prediction` rules, so changing an earlier pick updates or clears the affected later picks.

#### Scenario: Pick advances up the tree

- **WHEN** the fan clicks a team in a match
- **THEN** that team is marked the match's predicted winner and appears as a participant in the match it feeds

#### Scenario: Changing an earlier pick updates downstream

- **WHEN** the fan changes a pick whose previous winner had advanced further
- **THEN** the now-invalid later picks are cleared in the view, keeping the bracket consistent

#### Scenario: Round of 32 shows real participants

- **WHEN** the bracket is displayed and the Round of 32 is set
- **THEN** each Round-of-32 match shows its two concrete teams

### Requirement: Local persistence of picks

The predictor SHALL persist the fan's picks in the browser (no account required) so a partially or fully filled bracket survives a page reload, associated with the current locked bracket.

#### Scenario: Picks survive a reload

- **WHEN** the fan has made picks and reloads the page
- **THEN** the previously made picks are restored

#### Scenario: No account required

- **WHEN** a fan uses the predictor
- **THEN** they can fill, save, and resume a bracket without signing in

### Requirement: Lock-aware editing

The predictor SHALL allow editing only while the prediction is editable (before the first knockout kickoff) and SHALL present a read-only bracket once locked, consistent with `bracket-prediction` lock state.

#### Scenario: Editable before lock

- **WHEN** no knockout match has kicked off
- **THEN** the fan can pick and change winners

#### Scenario: Read-only after lock

- **WHEN** the first knockout match has kicked off
- **THEN** the bracket is presented read-only and picks can no longer be changed

### Requirement: Live scoring and headline figures

The predictor SHALL evaluate the bracket server-side as picks change and update as real results come in. Each pick SHALL show its status (pending / correct / wrong / busted) distinguishable at a glance, and SHALL carry an upset marker when it is a bold (head-to-head underdog) pick. The post-bracket panel's headline SHALL be the **pool-finish verdict** (see `bracket-verdict-card`) — shown when the bracket is complete — rather than a projected-score figure.

#### Scenario: Headline is the pool-finish verdict

- **WHEN** the predictor renders a complete bracket
- **THEN** the post-bracket panel leads with the pool-finish verdict (win probability and projected finish), not a projected-score headline

#### Scenario: Pick status is visible

- **WHEN** real results have decided some of the fan's picks
- **THEN** each affected pick shows its status (correct / wrong / busted) and undecided picks show as pending

#### Scenario: Per-pick upset marker

- **WHEN** a fan inspects a pick
- **THEN** a bold (head-to-head underdog) pick carries an upset marker

### Requirement: Model comparison surfaced

The predictor SHALL surface the you-vs-the-model comparison: each pick's model probability, an aggregate **boldness** measure (how many of the fan's picks are head-to-head underdogs), and inline upset/cinderella flags for matches where the model rates the favourite unusually low.

#### Scenario: Per-pick model probability shown

- **WHEN** a fan inspects a pick
- **THEN** the model's probability for that pick is shown (e.g. "the model gives this 9%")

#### Scenario: Boldness summarised

- **WHEN** the bracket is rendered
- **THEN** a summary of how bold the fan's bracket is (the count/share of head-to-head underdog picks) is shown

#### Scenario: Upset flagged inline

- **WHEN** a matchup has an unusually low favourite win probability
- **THEN** the predictor flags it inline as an upset/cinderella watch

### Requirement: Projected R32 surfaced as a fallback

When the real Round of 32 is not yet set, the predictor SHALL present the model-projected R32 (from `knockout-bracket`'s projected fill) so the fan can fill a complete bracket, clearly indicating that the field is **projected and not yet official** — both as an overall notice and by marking each projected team. Real (decided) participants SHALL NOT be marked projected.

#### Scenario: Projected field is labelled

- **WHEN** any Round-of-32 slot is filled by a model projection
- **THEN** the predictor shows a clear "projected — not yet official" notice and marks each projected team as projected

#### Scenario: Real teams not marked projected

- **WHEN** a Round-of-32 slot's team is known from real results
- **THEN** that team is shown without a projected marker

### Requirement: Original styling, no FIFA imagery

The predictor UI SHALL use original styling consistent with the rest of the app and SHALL NOT use FIFA logos or imagery.

#### Scenario: No FIFA marks

- **WHEN** the predictor renders
- **THEN** it uses original styling and contains no FIFA logos or trademarked imagery

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

### Requirement: Minimal future-round slots

Knockout slots whose participant is not yet determined (later-round matches awaiting picks or results) SHALL render as quiet, empty slots — not verbose "Winner of M.. (X v Y)" labels. A slot SHALL show a team only once it is determined (by the fan's pick of the feeding match, a model projection, or a real result); otherwise it reads as an empty placeholder that is easy to scan past.

#### Scenario: Undetermined later-round slot is blank

- **WHEN** a later-round match has no determined participant for a slot
- **THEN** that slot renders as an empty/quiet placeholder, without a verbose feeder description

#### Scenario: Slot fills when determined

- **WHEN** the fan picks the feeding match (or a projection/result determines it)
- **THEN** the dependent slot shows that team

### Requirement: Legible, high-contrast predictor UI

The predictor surface SHALL be legible and easy on the eyes: sufficient text/background contrast, clear visual hierarchy, and adequate spacing. Dimming/low-contrast treatment SHALL be reserved for genuinely inactive or secondary elements, not active content the user needs to read.

#### Scenario: Active content is readable

- **WHEN** the predictor renders its picks, odds, and scorecard
- **THEN** the active text and controls have comfortable contrast against the background and are easy to read

#### Scenario: Only inactive elements are dimmed

- **WHEN** an element is genuinely inactive (e.g. an empty future slot, a disabled action)
- **THEN** it may be dimmed; active content is not

### Requirement: Consistent matchup win probability

A head-to-head win probability shown for a specific matchup SHALL come from the single `matchup-probability` model (the Poisson head-to-head that matches the simulation), so the bracket and the Analyst report the same number for the same matchup, and that number is consistent with the simulation that produces the aggregate odds. The Round-of-32 card's per-team win probability (and its "upset watch" flag) SHALL be derived from this model, and SHALL be shown identically whether or not the slot is picked. This is the same source the Analyst's team comparison uses, so the two never disagree for the same pairing.

#### Scenario: Card and Analyst agree for the same matchup

- **WHEN** a Round-of-32 matchup's win probability is shown on the bracket and the Analyst is asked about the same two teams
- **THEN** both report the same head-to-head win probability (the `matchup-probability` model)

#### Scenario: Displayed head-to-head matches the simulation

- **WHEN** a matchup's displayed win probability is compared to the Monte-Carlo matchup odds for the same pairing
- **THEN** they agree within Monte-Carlo error (the display is no longer a separate, sharper logistic)

#### Scenario: Probability is stable across pick state

- **WHEN** a Round-of-32 slot is shown, then the user picks (or unpicks) that match
- **THEN** the displayed head-to-head win probability for that matchup is unchanged by the pick state

#### Scenario: Aggregate odds remain model-driven

- **WHEN** aggregate figures are shown (advancement, champion, survival, pool finish)
- **THEN** they continue to come from the Monte-Carlo model, now consistent with the displayed head-to-heads

