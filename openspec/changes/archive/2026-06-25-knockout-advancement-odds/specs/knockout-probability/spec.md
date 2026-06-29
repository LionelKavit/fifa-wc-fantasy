## ADDED Requirements

### Requirement: Per-trial bracket play-out

The system SHALL extend each Monte Carlo trial so that, after sampling all remaining group fixtures and determining the 32 qualifiers (group top two plus the eight best third-placed teams), it plays the full knockout bracket — Round of 32 → Round of 16 → Quarterfinals → Semifinals → Final — by sampling each knockout match's outcome with the same injectable outcome model used for group fixtures. The play-out SHALL reuse the `knockout-bracket` structure (slots, feeders, seeding, and third-placed allocation) rather than re-deriving the tree.

#### Scenario: A trial advances one champion

- **WHEN** a trial plays out the bracket
- **THEN** every knockout match produces exactly one winner, each round halves the field, and the trial yields exactly one champion

#### Scenario: Knockout outcomes use the shared outcome model

- **WHEN** a knockout match is simulated in a trial
- **THEN** its result is drawn from the same injectable outcome model used for group fixtures, with no separate hardcoded outcome logic

#### Scenario: Completed knockout results are fixed

- **WHEN** the snapshot already records a completed knockout match
- **THEN** trials keep that real result and only sample knockout matches that are not yet decided

#### Scenario: A knockout match never ends level

- **WHEN** a sampled knockout match would otherwise be a draw
- **THEN** the trial resolves it to a single winner (knockout matches cannot end tied), deterministically given the trial's random stream

### Requirement: Per-team deep-run probabilities

The system SHALL report, for each team, the probability of reaching each knockout stage — Round of 16, Quarterfinals, Semifinals, Final, and Champion — as the fraction of trials in which the team reaches that stage. Reaching a later stage SHALL imply reaching every earlier stage, so each team's stage probabilities are non-increasing from Round of 32 through Champion.

#### Scenario: Stage probabilities are monotonic

- **WHEN** a team's deep-run probabilities are reported
- **THEN** P(reach R16) ≥ P(reach QF) ≥ P(reach SF) ≥ P(reach Final) ≥ P(Champion), each in [0, 1]

#### Scenario: Reaching a stage means winning the prior round

- **WHEN** a team reaches a given stage in a trial
- **THEN** it is counted as reaching that stage only if it won its match in the preceding round (or, for the Round of 32, qualified from the group stage)

#### Scenario: Champions sum to one tournament

- **WHEN** champion probabilities are summed across all teams over the trials
- **THEN** the totals are consistent with exactly one champion per trial (the probabilities sum to 1 across all teams)

### Requirement: Settled-case short-circuits

The system SHALL pin settled cases exactly rather than relying on sampling noise: a team that cannot reach the Round of 32 (eliminated per the deterministic layer) SHALL report 0 for every knockout stage. Round-of-32 advancement remains governed by `advancement-probability`; this capability SHALL be consistent with it at that boundary.

#### Scenario: Eliminated team reports all zeros

- **WHEN** a team cannot reach the Round of 32 under any outcome
- **THEN** its probability of reaching every knockout stage (R16 through Champion) is 0

#### Scenario: Consistent with advancement probability at the boundary

- **WHEN** a team's probability of reaching the Round of 16 is compared to its Round-of-32 advancement probability from `advancement-probability`
- **THEN** P(reach R16) does not exceed P(reach R32), and a team with 0 advancement probability has 0 for all knockout stages

### Requirement: Matchup-level conditional win probabilities

The system SHALL expose, separately from per-team stage totals, conditional win probabilities for prospective knockout pairings — for a pairing that occurs in some trials, the probability that each side wins given that the pairing occurs. This is the per-pairing signal an upset indicator consumes and SHALL be derivable without re-running the simulation.

#### Scenario: Conditional win probabilities for an observed pairing

- **WHEN** two teams meet in a knockout match in some trials
- **THEN** the system reports each side's win probability conditioned on that pairing occurring, summing to 1 across the two sides

#### Scenario: No pairing reported when teams never meet

- **WHEN** two teams never meet in any trial
- **THEN** no conditional win probability is reported for that pairing

### Requirement: Determinism and reproducibility

The system SHALL produce identical deep-run probabilities for identical inputs (snapshot, trial count, and seed), consistent with the existing simulation's determinism, so results are reproducible and testable.

#### Scenario: Same seed yields same odds

- **WHEN** the simulation is run twice with the same snapshot, trial count, and seed
- **THEN** the reported deep-run probabilities and matchup conditionals are identical
