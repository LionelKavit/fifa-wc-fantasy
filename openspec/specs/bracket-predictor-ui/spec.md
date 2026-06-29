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

The predictor SHALL allow editing every knockout match that is not yet decided — including matches that are **live/in-progress** — and SHALL present only the **decided** matches as read-only, showing each decided match's real winner. There SHALL be no global read-only state and no "the knockouts have started" banner that freezes the whole bracket; deciding one match SHALL NOT disable the others. The Build box actions SHALL remain available throughout the knockouts: **autofill** SHALL complete the not-yet-decided matches while keeping decided results fixed (never contradicting a real winner), and **Clear** SHALL reset only the not-yet-decided picks (decided results persist).

#### Scenario: Editable while live or scheduled

- **WHEN** a knockout match is not yet complete (scheduled or live)
- **THEN** the fan can pick or change its winner

#### Scenario: Decided match is read-only with the real winner

- **WHEN** a knockout match is complete with a winner
- **THEN** that match is shown read-only with its real winner and cannot be changed

#### Scenario: Actions stay available once some matches are decided

- **WHEN** some knockout matches are decided and others are not
- **THEN** autofill completes the not-decided matches (keeping the decided results) and Clear clears only the not-decided picks, with no global read-only state

### Requirement: Live scoring and headline figures

The predictor SHALL evaluate the bracket server-side as picks change and update as real results come in. Each pick SHALL show its status (pending / correct / wrong / busted) distinguishable at a glance, and SHALL carry an upset marker when it is a bold (head-to-head underdog) pick. The post-bracket panel SHALL NOT show a headline verdict, win probability, or projected-score figure — that figure was decluttered out of the panel; "how is my bracket doing?" is answered by the Analyst chat, not a panel headline.

#### Scenario: No headline verdict in the panel

- **WHEN** the predictor renders a complete bracket
- **THEN** the post-bracket panel shows no pool-finish verdict, win-probability, or projected-score headline

#### Scenario: Pick status is visible

- **WHEN** real results have decided some of the fan's picks
- **THEN** each affected pick shows its status (correct / wrong / busted) and undecided picks show as pending

#### Scenario: Per-pick upset marker

- **WHEN** a fan inspects a pick
- **THEN** a bold (head-to-head underdog) pick carries an upset marker

### Requirement: Model comparison surfaced

The predictor SHALL surface the you-vs-the-model comparison: each pick's win probability, an aggregate **boldness** measure (how many of the fan's picks are head-to-head underdogs), and inline upset/cinderella flags for matches where the model rates the favourite unusually low. The per-pick win probability shown on a card SHALL be the **head-to-head probability that the picked team beats its predicted opponent** in the user's bracket (from the `matchup-probability` model) — the same number the Analyst reports for that pairing — NOT the marginal probability of reaching the next round. This is a display choice only; the bracket the engine generates is unchanged. The inline flag SHALL be phrased "chance of upset". A match card's per-pick row SHALL show win/model probabilities only and SHALL NOT show a per-pick expected-points figure.

#### Scenario: Per-pick head-to-head shown

- **WHEN** a fan inspects a future-round pick
- **THEN** the percentage shown is the picked team's head-to-head win probability against its predicted opponent (e.g. Colombia vs the team it is projected to play), not the marginal chance of reaching the next round

#### Scenario: Card agrees with the Analyst for the same pick

- **WHEN** the card shows a pick's percentage and the Analyst is asked about that pick's matchup
- **THEN** both report the same head-to-head win probability

#### Scenario: Boldness summarised

- **WHEN** the bracket is rendered
- **THEN** a summary of how bold the fan's bracket is (the count/share of head-to-head underdog picks) is shown

#### Scenario: Upset flagged inline as "chance of upset"

- **WHEN** a matchup has an unusually low favourite win probability
- **THEN** the predictor flags it inline phrased as "chance of upset"

#### Scenario: No per-pick points figure

- **WHEN** a match card renders a pick
- **THEN** it shows the win/model percentage (and the bold-underdog marker when applicable) but no expected-points figure

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

The predictor SHALL let the user finalize ("lock") their picks and export the bracket so they can submit it in their own pool. Export SHALL offer a **CSV** listing the picks (round, match, picked team). Exported content SHALL reflect the user's current picks, so what is downloaded matches what the predictor shows. The finalize action is user-driven and distinct from the tournament-kickoff read-only lock.

#### Scenario: Finalize then export

- **WHEN** the user finalizes their bracket
- **THEN** they are offered a CSV export of their picks

#### Scenario: CSV reflects the picks

- **WHEN** the user downloads the CSV
- **THEN** it lists their picks (round, match, picked team) matching the on-screen bracket

#### Scenario: Export matches the predictor

- **WHEN** an export is produced
- **THEN** its picks match the predictor's current bracket

#### Scenario: Finalize is not the tournament lock

- **WHEN** the user finalizes before the knockouts start
- **THEN** they may still go back and edit, then re-export (finalize is a commit-and-export step, not the irreversible tournament-kickoff lock)

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

