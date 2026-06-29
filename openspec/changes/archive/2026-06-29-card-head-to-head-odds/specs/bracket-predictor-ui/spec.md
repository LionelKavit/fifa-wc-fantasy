## MODIFIED Requirements

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
