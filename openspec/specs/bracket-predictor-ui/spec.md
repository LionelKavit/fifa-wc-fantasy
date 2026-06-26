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

The predictor SHALL display, from the evaluation endpoint, the prediction's **projected (expected) score** and its **survival probability** as co-headline figures, plus the current base score, the upset bonus, and the boldness count — updating as real results come in. Each pick SHALL be shown with its status (pending / correct / wrong / busted) distinguishable at a glance, and SHALL show its expected points and an upset marker when it is a bold (head-to-head underdog) pick.

#### Scenario: Projected score and survival shown as co-headlines

- **WHEN** the predictor renders a bracket with picks
- **THEN** the projected (expected) score and the survival probability are both displayed prominently as headline figures

#### Scenario: Pick status is visible

- **WHEN** real results have decided some of the fan's picks
- **THEN** each affected pick shows its status (correct / wrong / busted) and undecided picks show as pending

#### Scenario: Base score, upset bonus, and boldness shown

- **WHEN** the predictor renders scores
- **THEN** the base (round-weighted) score, the upset bonus, and the boldness count are shown

#### Scenario: Per-pick expected points and upset marker

- **WHEN** a fan inspects a pick
- **THEN** its expected points are shown, and a bold (head-to-head underdog) pick carries an upset marker

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

