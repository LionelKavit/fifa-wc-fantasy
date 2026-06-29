## MODIFIED Requirements

### Requirement: Upset multiplier by underdog size

The system SHALL compute, for each pick, an upset multiplier from the picked team's pre-match win probability in the matchup the prediction implies it plays (the two teams the prediction pairs at that match), using the `matchup-probability` head-to-head (the Poisson model that matches the simulation), not the Elo logistic. The multiplier SHALL increase as the picked team is a larger underdog, in three bands: a favorite or coin-flip (win probability at or above the upper cutoff) SHALL be ×1; an underdog (win probability at or above the lower cutoff but below the upper cutoff) SHALL be ×2; a big underdog (win probability below the lower cutoff) SHALL be ×3. The two cutoffs SHALL be a single named, configurable constant, calibrated for the head-to-head model in use (the flatter Poisson probabilities may warrant cutoffs different from the prior Elo-tuned 0.40 / 0.20). The multiplier only affects points on `correct` picks; it does not by itself create points.

#### Scenario: Favorite or coin-flip pick

- **WHEN** the picked team's matchup win probability is at or above the upper cutoff
- **THEN** its upset multiplier is ×1

#### Scenario: Underdog pick

- **WHEN** the picked team's matchup win probability is at or above the lower cutoff and below the upper cutoff
- **THEN** its upset multiplier is ×2

#### Scenario: Big-underdog pick

- **WHEN** the picked team's matchup win probability is below the lower cutoff
- **THEN** its upset multiplier is ×3

#### Scenario: Cutoffs are configurable

- **WHEN** alternative cutoffs are supplied
- **THEN** the bands are computed against those cutoffs instead of the defaults

#### Scenario: Probability source matches the rest of the app

- **WHEN** the multiplier's win probability is computed for a matchup
- **THEN** it is the same `matchup-probability` value shown on the card and reported by the Analyst for that pairing
