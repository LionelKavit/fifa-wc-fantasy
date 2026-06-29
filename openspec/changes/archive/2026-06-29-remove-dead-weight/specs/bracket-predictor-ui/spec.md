## MODIFIED Requirements

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
