## MODIFIED Requirements

### Requirement: Model comparison surfaced

The predictor SHALL surface the you-vs-the-model comparison: each pick's model probability, an aggregate **boldness** measure (how many of the fan's picks are head-to-head underdogs), and inline upset/cinderella flags for matches where the model rates the favourite unusually low. The inline flag SHALL be phrased "chance of upset". A match card's per-pick row SHALL show win/model probabilities only and SHALL NOT show a per-pick expected-points figure.

#### Scenario: Per-pick model probability shown

- **WHEN** a fan inspects a pick
- **THEN** the model's probability for that pick is shown (e.g. "the model gives this 9%")

#### Scenario: Boldness summarised

- **WHEN** the bracket is rendered
- **THEN** a summary of how bold the fan's bracket is (the count/share of head-to-head underdog picks) is shown

#### Scenario: Upset flagged inline as "chance of upset"

- **WHEN** a matchup has an unusually low favourite win probability
- **THEN** the predictor flags it inline phrased as "chance of upset"

#### Scenario: No per-pick points figure

- **WHEN** a match card renders a pick
- **THEN** it shows the win/model percentage (and the bold-underdog marker when applicable) but no expected-points figure

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

## REMOVED Requirements

### Requirement: Mainstream export formats (CSV, PNG, PDF)

**Reason**: PNG and PDF exports added little over the CSV (the format pool trackers ingest) and carried a client dependency and a server image path; they are removed. CSV remains the sole export.
**Migration**: None — CSV export is unchanged (see "Finalize and export the bracket"). The `/api/share` PNG endpoint and `predictor-share-card` capability remain server-side but are no longer linked from the predictor.
