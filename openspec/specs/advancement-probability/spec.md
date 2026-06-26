# advancement-probability Specification

## Purpose
TBD - created by archiving change probabilistic-scenario-engine. Update Purpose after archive.
## Requirements
### Requirement: Poisson scoreline sampling model

The system SHALL sample each remaining fixture's scoreline by drawing each team's goals from an independent Poisson distribution whose rate derives from per-team strength plus a home-advantage term, and SHALL expose this outcome model behind an injectable interface so it can be replaced without changing the simulation loop. Per-team strength SHALL be derived from the ingested team strength ratings (Elo) when available, so stronger teams have a higher scoring rate and matchups reflect real disparities; when a team has no rating, it SHALL fall back to a neutral baseline. The home-advantage term SHALL apply only to a host nation playing on home soil (the WC 2026 hosts), since all other matches are effectively at neutral venues.

#### Scenario: Goals drawn from Poisson

- **WHEN** a remaining fixture is sampled
- **THEN** each side's goal count is a non-negative integer drawn from a Poisson distribution parameterized by that side's rate

#### Scenario: Strength derived from ratings

- **WHEN** team strength ratings are available and two teams of clearly different rating meet
- **THEN** the higher-rated team has a higher expected scoring rate, so its modelled win probability materially exceeds an even split

#### Scenario: Neutral fallback without a rating

- **WHEN** no strength rating is available for a team
- **THEN** that team uses a neutral baseline strength so the model introduces no team-specific bias for it beyond home advantage

#### Scenario: Home advantage only for hosts at home

- **WHEN** a match involves a host nation playing in its own country
- **THEN** the home-advantage term is applied to that host; for all other matches no home-advantage term is applied

#### Scenario: Model is injectable

- **WHEN** an alternative outcome model is supplied
- **THEN** the simulation uses it without other code changes

### Requirement: Monte Carlo simulation of remaining group fixtures

The system SHALL estimate advancement by running many trials in which every remaining group fixture is assigned a sampled scoreline, then recomputing final group standings and the best-8 third-placed selection per trial.

#### Scenario: Each trial produces a complete outcome

- **WHEN** a trial runs
- **THEN** every remaining group fixture receives a sampled result, all 12 groups have final standings, and the 8 qualifying third-placed teams are determined for that trial

#### Scenario: Completed fixtures are fixed

- **WHEN** trials run
- **THEN** already-completed fixtures keep their real results and only unplayed fixtures are sampled

### Requirement: Per-team advancement probability

The system SHALL report each team's estimated probability of advancing to the Round of 32 as the fraction of trials in which it finishes top 2 of its group or among the best 8 third-placed teams.

#### Scenario: Clinched team reports certainty

- **WHEN** a team is already guaranteed top 2 (per the deterministic layer)
- **THEN** its advancement probability is reported as 1.0 without depending on sampling noise

#### Scenario: Eliminated team reports zero

- **WHEN** a team cannot advance under any outcome
- **THEN** its advancement probability is reported as 0.0

#### Scenario: Contended team reports a fraction

- **WHEN** a team advances in some but not all trials
- **THEN** its advancement probability is the fraction of trials in which it advanced, in [0, 1]

### Requirement: Conditional-on-own-result breakdown

For a team with a remaining fixture, the system SHALL report its advancement probability conditioned on its own next result: given a win, given a draw, and given a loss.

#### Scenario: Conditional split reported

- **WHEN** advancement is requested for a team with an unplayed fixture
- **THEN** the system returns advancement probabilities for the win, draw, and loss branches of that fixture

#### Scenario: Conditional consistency

- **WHEN** conditional probabilities are computed
- **THEN** each branch's probability is estimated from only the trials consistent with that branch's own result

### Requirement: Reproducible and bounded-cost simulation

The system SHALL accept a seed for reproducible results and a configurable trial count, and SHALL complete the default trial count fast enough to refresh interactively.

#### Scenario: Seed reproducibility

- **WHEN** the simulation runs twice with the same seed and trial count
- **THEN** it produces identical advancement probabilities

#### Scenario: Configurable trials

- **WHEN** a trial count is supplied
- **THEN** the simulation runs that many trials and aggregates over them

### Requirement: Per-group finishing-position probabilities

The system SHALL report, for each team, the probability that it finishes 1st, 2nd, and 3rd in its group, estimated from the same Monte Carlo trials used for advancement probability (each trial already produces a complete final ordering per group). For each group these probabilities SHALL be consistent with exactly one team per position per trial. Settled cases SHALL be respected: when a group is already final, the actual finishing positions SHALL be reported as certainties.

#### Scenario: Finishing-position probabilities reported

- **WHEN** advancement is computed for a group that is not yet decided
- **THEN** each team has a probability of finishing 1st, 2nd, and 3rd, each in [0, 1]

#### Scenario: One team per position per trial

- **WHEN** finishing-position probabilities are aggregated across trials for a group
- **THEN** the probabilities of finishing 1st sum to 1 across the group's teams (and likewise for 2nd and 3rd)

#### Scenario: Final group reports certainties

- **WHEN** a group's standings are already final
- **THEN** the actual 1st, 2nd, and 3rd placed teams are reported with probability 1 for their positions

