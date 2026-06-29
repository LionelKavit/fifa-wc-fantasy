## ADDED Requirements

### Requirement: Consistent matchup win probability

A head-to-head win probability shown for a specific matchup SHALL come from a single model — the Elo head-to-head — so the bracket and the Analyst report the same number for the same matchup. The Round-of-32 card's per-team win probability (and its "upset watch" flag) SHALL be derived from this Elo head-to-head, and SHALL be shown identically whether or not the slot is picked. This is the same source the Analyst's team comparison uses, so the two never disagree for the same pairing.

#### Scenario: Card and Analyst agree for the same matchup

- **WHEN** a Round-of-32 matchup's win probability is shown on the bracket and the Analyst is asked about the same two teams
- **THEN** both report the same head-to-head win probability (the Elo head-to-head)

#### Scenario: Probability is stable across pick state

- **WHEN** a Round-of-32 slot is shown, then the user picks (or unpicks) that match
- **THEN** the displayed head-to-head win probability for that matchup is unchanged by the pick state

#### Scenario: Aggregate odds remain model-driven

- **WHEN** aggregate figures are shown (advancement, champion, survival, pool finish)
- **THEN** they continue to come from the Monte-Carlo model and are unaffected by this change, since they are not per-matchup head-to-heads
