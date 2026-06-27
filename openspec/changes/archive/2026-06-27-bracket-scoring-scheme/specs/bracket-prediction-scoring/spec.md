## MODIFIED Requirements

### Requirement: Round-weighted points

The system SHALL award points only for `correct` picks. A correct pick's points SHALL be its round base multiplied by an upset multiplier: `points = roundBase × upsetMultiplier`. The round base SHALL be weighted so later rounds are worth strictly more than earlier rounds (Round of 32 < Round of 16 < Quarterfinal < Semifinal < Final). The per-round base weights SHALL be configurable, with a sensible default that preserves this strict ordering and doubles each round (Round of 32 = 1, Round of 16 = 2, Quarterfinal = 4, Semifinal = 8, Final = 16). The upset multiplier is defined in "Upset multiplier by underdog size".

#### Scenario: Correct picks earn round base times multiplier

- **WHEN** a pick is `correct`
- **THEN** it contributes `roundBase × upsetMultiplier` to the score, where `roundBase` is that round's configured weight

#### Scenario: Non-correct picks earn nothing

- **WHEN** a pick is `wrong`, `busted`, or `pending`
- **THEN** it contributes zero points, regardless of its upset multiplier

#### Scenario: Later rounds outweigh earlier rounds

- **WHEN** the default base weights are used and the upset multiplier is held equal
- **THEN** the base of a Final pick exceeds a Semifinal pick, which exceeds a Quarterfinal, which exceeds a Round-of-16, which exceeds a Round-of-32 pick

#### Scenario: A correct chalk pick uses the bare base

- **WHEN** a `correct` pick's team was the favorite (or a coin-flip) in its matchup, so its upset multiplier is ×1
- **THEN** it contributes exactly that round's base weight

### Requirement: Current and maximum-achievable totals

The system SHALL report the prediction's current score (the sum of `roundBase × upsetMultiplier` over all `correct` picks) and the maximum still-achievable score (the current score plus the summed `roundBase × upsetMultiplier` of all picks that are still `pending` — i.e. not yet dead). `busted` and `wrong` picks SHALL NOT contribute to the maximum. The maximum SHALL be greater than or equal to the current score, and SHALL equal the current score once no pick is `pending`.

#### Scenario: Maximum includes only live picks, with their multipliers

- **WHEN** totals are computed
- **THEN** the maximum equals the current score plus `roundBase × upsetMultiplier` for every `pending` pick, excluding `wrong` and `busted` picks

#### Scenario: Maximum converges to final score

- **WHEN** no pick remains `pending` (every match is decided or busted)
- **THEN** the maximum-achievable score equals the current score

#### Scenario: Maximum never below current

- **WHEN** totals are computed at any point
- **THEN** the maximum-achievable score is greater than or equal to the current score

### Requirement: Pure scoring over a prediction and snapshot

The system SHALL expose scoring as a pure function over a prediction, a tournament snapshot (from which the actual `knockout-bracket` and real eliminations are derived), and the per-matchup win probabilities used for the upset multiplier. It SHALL have no UI, network, or storage dependencies and SHALL produce per-pick statuses, per-pick detail, and the aggregate totals deterministically. Given the same inputs, repeated runs SHALL return identical results.

#### Scenario: Deterministic and side-effect-free

- **WHEN** scoring is run twice on the same prediction, snapshot, and matchup probabilities
- **THEN** it returns identical per-pick statuses, per-pick detail, and totals, performing no I/O

## ADDED Requirements

### Requirement: Upset multiplier by underdog size

The system SHALL compute, for each pick, an upset multiplier from the picked team's pre-match win probability in the matchup the prediction implies it plays (the two teams the prediction pairs at that match), using the model's Elo-derived head-to-head probability. The multiplier SHALL increase as the picked team is a larger underdog, in three bands: a favorite or coin-flip (win probability at or above the upper cutoff) SHALL be ×1; an underdog (win probability at or above the lower cutoff but below the upper cutoff) SHALL be ×2; a big underdog (win probability below the lower cutoff) SHALL be ×3. The two cutoffs (default upper = 0.40, lower = 0.20) SHALL be a single named, configurable constant. The multiplier only affects points on `correct` picks; it does not by itself create points.

#### Scenario: Favorite or coin-flip pick

- **WHEN** the picked team's matchup win probability is at or above the upper cutoff (default 0.40)
- **THEN** its upset multiplier is ×1

#### Scenario: Underdog pick

- **WHEN** the picked team's matchup win probability is at or above the lower cutoff and below the upper cutoff (default 0.20–0.40)
- **THEN** its upset multiplier is ×2

#### Scenario: Big-underdog pick

- **WHEN** the picked team's matchup win probability is below the lower cutoff (default 0.20)
- **THEN** its upset multiplier is ×3

#### Scenario: Cutoffs are configurable

- **WHEN** alternative cutoffs are supplied
- **THEN** the bands are computed against those cutoffs instead of the defaults

### Requirement: Per-pick scoring transparency

For every pick, the system SHALL expose the detail behind its points: the round base, the picked team's matchup win probability, the upset multiplier applied, and the resulting points. This detail SHALL be present for all picks (including `wrong`, `busted`, and `pending`) so a consumer can explain what a pick is or would be worth.

#### Scenario: Detail exposed for a correct upset pick

- **WHEN** a `correct` pick's team was an underdog (e.g. 30% win probability, ×2)
- **THEN** its detail reports the round base, the 30% win probability, the ×2 multiplier, and points equal to `roundBase × 2`

#### Scenario: Detail exposed for a non-correct pick

- **WHEN** a pick is `pending`, `wrong`, or `busted`
- **THEN** its detail still reports the round base, the win probability, and the multiplier (its earned points being zero unless and until it is `correct`)
