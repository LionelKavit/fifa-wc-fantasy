## ADDED Requirements

### Requirement: Per-pick status classification

The system SHALL classify each of a prediction's picks against the actual results in the snapshot as exactly one of: `correct` (the pick's match is decided and the picked team is the real winner), `wrong` (the pick's match is decided and the picked team is not the real winner but did reach the match), `busted` (the picked team did not reach that match in reality and can no longer do so, because it was eliminated in an earlier real round), or `pending` (the match is not yet decided and the picked team is still able to reach and win it). A pick with no real outcome yet and a still-alive team SHALL be `pending`; a pick whose team is already out of the real tournament before reaching the match SHALL be `busted` even if the match itself has not been played.

#### Scenario: Correct pick

- **WHEN** a pick's match is decided in reality and the picked team is the real winner
- **THEN** the pick is `correct`

#### Scenario: Wrong pick at a played match

- **WHEN** a pick's match is decided and the picked team took part but lost
- **THEN** the pick is `wrong`

#### Scenario: Busted branch before the match is played

- **WHEN** the team picked to win a later match was eliminated in an earlier real round, so it never reaches that match
- **THEN** the pick is `busted`, regardless of whether that later match has been played

#### Scenario: Pending pick

- **WHEN** a pick's match is not yet decided and the picked team is still alive and able to reach it
- **THEN** the pick is `pending`

### Requirement: Round-weighted points

The system SHALL award points only for `correct` picks, weighted by the match's round such that later rounds are worth strictly more than earlier rounds (Round of 32 < Round of 16 < Quarterfinal < Semifinal < Final). The per-round weights SHALL be configurable, with a sensible default that preserves this strict ordering.

#### Scenario: Correct picks earn their round's weight

- **WHEN** a pick is `correct`
- **THEN** it contributes that round's configured weight to the score

#### Scenario: Non-correct picks earn nothing

- **WHEN** a pick is `wrong`, `busted`, or `pending`
- **THEN** it contributes zero points

#### Scenario: Later rounds outweigh earlier rounds

- **WHEN** the default weights are used
- **THEN** the weight of a Final pick exceeds a Semifinal pick, which exceeds a Quarterfinal, which exceeds a Round-of-16, which exceeds a Round-of-32 pick

### Requirement: Current and maximum-achievable totals

The system SHALL report the prediction's current score (the sum of weights of all `correct` picks) and the maximum still-achievable score (the current score plus the summed weights of all picks that are still `pending` — i.e. not yet dead). `busted` and `wrong` picks SHALL NOT contribute to the maximum. The maximum SHALL be greater than or equal to the current score, and SHALL equal the current score once no pick is `pending`.

#### Scenario: Maximum includes only live picks

- **WHEN** totals are computed
- **THEN** the maximum equals the current score plus the weights of all `pending` picks, excluding `wrong` and `busted` picks

#### Scenario: Maximum converges to final score

- **WHEN** no pick remains `pending` (every match is decided or busted)
- **THEN** the maximum-achievable score equals the current score

#### Scenario: Maximum never below current

- **WHEN** totals are computed at any point
- **THEN** the maximum-achievable score is greater than or equal to the current score

### Requirement: Pure scoring over a prediction and snapshot

The system SHALL expose scoring as a pure function over a prediction and a tournament snapshot (from which the actual `knockout-bracket` and real eliminations are derived), with no UI, network, or storage dependencies, producing per-pick statuses and the aggregate totals deterministically.

#### Scenario: Deterministic and side-effect-free

- **WHEN** scoring is run twice on the same prediction and snapshot
- **THEN** it returns identical per-pick statuses and totals, performing no I/O
