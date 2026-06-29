## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Leaderboard-style scorecard

**Reason**: Replaced by the post-bracket verdict card (`bracket-verdict-card`), which answers "will this win my pool?" rather than presenting a projected-score standings panel.

**Migration**: The `Headline` scorecard component is retained in the codebase but no longer rendered; the post-bracket panel is now the verdict card. The boldness summary that lived on the scorecard remains available via the "Model comparison surfaced" requirement.
