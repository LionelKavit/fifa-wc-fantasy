# knockout-bracket Specification

## Purpose
TBD - created by archiving change knockout-bracket-structure. Update Purpose after archive.
## Requirements
### Requirement: Fixed knockout tree shape

The system SHALL construct the FIFA World Cup 2026 knockout tree as a single-elimination bracket with the fixed rounds, in order: Round of 32 (16 matches) → Round of 16 (8 matches) → Quarterfinals (4 matches) → Semifinals (2 matches) → Final (1 match), aligned to the snapshot stages `R32`, `R16`, `QF`, `SF`, `F`. The tree SHALL be a pure function of the `TournamentSnapshot` and SHALL NOT compute any probabilities.

#### Scenario: Correct match counts per round

- **WHEN** the bracket is constructed
- **THEN** it contains exactly 16 Round-of-32 matches, 8 Round-of-16 matches, 4 Quarterfinals, 2 Semifinals, and 1 Final

#### Scenario: Rounds chained in order

- **WHEN** the bracket is constructed
- **THEN** each non-R32 match's two participants are sourced from two distinct matches of the immediately preceding round, forming one connected tree that terminates at the Final

#### Scenario: Construction is pure

- **WHEN** the bracket function is called twice with identical snapshots
- **THEN** it returns identical bracket structures (same matches, slots, feeders, and any resolved teams)

### Requirement: Match slots and feeders

The system SHALL model every knockout match as having two participant slots, where each slot is described by a **feeder** identifying where that participant comes from. A feeder SHALL be exactly one of: a group-stage source (a specified group's winner or runner-up), a third-placed source (one of the eight qualifying third-placed teams, identified by the slot's lookup assignment), or a match-winner source (the winner of a specified earlier knockout match).

#### Scenario: Round of 32 fed from the group stage

- **WHEN** a Round-of-32 match's slots are inspected
- **THEN** each slot's feeder is a group-stage source (group winner or runner-up) or a third-placed source

#### Scenario: Later rounds fed by match winners

- **WHEN** a Round-of-16, Quarterfinal, Semifinal, or Final match's slots are inspected
- **THEN** each slot's feeder is a match-winner source referencing a specific match in the preceding round

#### Scenario: Feeder identifies its source unambiguously

- **WHEN** any feeder is inspected
- **THEN** it names exactly one source of one kind (group winner/runner-up, third-placed assignment, or a specific predecessor match), with no slot left without a feeder

### Requirement: Official Round-of-32 seeding of group winners and runners-up

The system SHALL assign the winner and runner-up of each of the 12 groups to their Round-of-32 slots according to the official FIFA World Cup 2026 bracket seeding layout, so that the pairing of group positions across the bracket matches the published schedule.

#### Scenario: Each group's top two placed

- **WHEN** the bracket is constructed
- **THEN** all 12 group winners and all 12 group runners-up are assigned to Round-of-32 slots, with each used exactly once

#### Scenario: Seeding matches the official layout

- **WHEN** a Round-of-32 match sourced from group winners/runners-up is inspected
- **THEN** the specific group positions it pairs (e.g. Winner Group A vs. a designated runner-up/third) match the official 2026 bracket layout, not an arbitrary pairing

### Requirement: Third-placed slots and grounded assignment

The bracket SHALL contain exactly eight Round-of-32 slots fed by a third-placed team, each carrying the set of **candidate group letters** whose third-placed side may occupy it (per FIFA's published candidate sets). The system SHALL resolve a third-placed slot to a concrete team grounded in the snapshot's own Round-of-32 fixtures — every third-placed slot is paired with a group winner, so once that winner is known the snapshot's assigned opponent for it is the slot's third-placed team. Until that assignment is available in the snapshot, the slot SHALL remain a candidate-set placeholder.

Self-computing the assignment from FIFA's 495-row Annex C allocation table (the combination of qualifying group letters → slot mapping) — required only when no authoritative snapshot assignment exists, e.g. for hypothetical or simulated snapshots — is explicitly **deferred to a later change** and is not part of this capability.

#### Scenario: Exactly eight third-placed slots with candidate sets

- **WHEN** the bracket is constructed
- **THEN** exactly eight Round-of-32 slots have a third-placed feeder, and each lists the candidate group letters that may fill it

#### Scenario: Grounded resolution from the snapshot

- **WHEN** a third-placed slot's paired group winner is known and the snapshot's Round-of-32 fixtures assign that winner an opponent
- **THEN** the slot resolves to that assigned opponent as its concrete third-placed team

#### Scenario: Placeholder until assignment is available

- **WHEN** the snapshot does not yet carry the Round-of-32 assignment for a third-placed slot
- **THEN** the slot remains a candidate-set placeholder rather than a concrete team

#### Scenario: Each third-placed slot resolves to one team

- **WHEN** the snapshot fully assigns the Round-of-32
- **THEN** each of the eight third-placed slots holds exactly one concrete team, with none duplicated or omitted

### Requirement: Placeholder representation of undetermined slots

The system SHALL represent any slot whose concrete team is not yet known as a human-readable placeholder rather than failing or inventing a team, and SHALL resolve placeholders to concrete teams as the underlying results become available. A group-stage feeder whose group is not yet decided SHALL render as a position placeholder (e.g. "Winner Group F", "Runner-up Group C"); a third-placed feeder whose allocation is not yet determined SHALL render as a candidate-set placeholder (e.g. "3rd C/E/F/H"); a match-winner feeder whose match is unfinished SHALL render in terms of that match's participants.

#### Scenario: Group position not yet decided

- **WHEN** a group has not finished and its winner or runner-up is undetermined
- **THEN** the dependent Round-of-32 slot is shown as a position placeholder naming the group and position, not a concrete team

#### Scenario: Third-placed allocation not yet determined

- **WHEN** the eight qualifying third-placed teams (or the applicable table row) are not yet determined
- **THEN** the dependent Round-of-32 slot is shown as a candidate-set placeholder describing the possible groups, not a concrete team

#### Scenario: Progressive resolution to concrete teams

- **WHEN** a group finalizes its standings, or the third-placed selection completes, or a knockout match completes in the snapshot
- **THEN** the corresponding placeholder resolves to the concrete qualifying team (or winner), while still-undetermined slots remain placeholders

#### Scenario: Fully decided bracket has no placeholders

- **WHEN** all groups are final and the eight third-placed qualifiers are determined
- **THEN** every Round-of-32 slot holds a concrete team and no Round-of-32 placeholder remains

### Requirement: Pure, snapshot-driven, reusable construction

The system SHALL expose bracket construction as a pure function over the `TournamentSnapshot`, reading group order from the `group-standings` capability and third-placed qualifiers from the `third-place-ranking` capability, without UI, network, or framework dependencies, so it can be reused by later probability, simulation, and prediction capabilities.

#### Scenario: No external dependencies

- **WHEN** the bracket is constructed
- **THEN** it uses only data already present in the snapshot and outputs of existing engine capabilities, with no network calls or UI/Next.js coupling

#### Scenario: Reusable inside other engine consumers

- **WHEN** another engine capability constructs the bracket from a snapshot (including a hypothetical/simulated one)
- **THEN** it obtains the same structured result without special-casing, enabling later per-trial use

### Requirement: Self-computed Annex C third-placed allocation

The system SHALL be able to assign the eight best third-placed teams to their Round-of-32 slots **without** an authoritative snapshot assignment, consistent with FIFA's Annex C, for the combination of group letters that produced the eight qualifiers. The assignment SHALL be derived from FIFA's official per-slot **candidate sets** (encoded as data) by computing a perfect matching that places each qualifying group into a slot whose candidate set permits it — guaranteeing every assignment is one FIFA's rules allow. It SHALL be used whenever a bracket is built from a snapshot whose Round-of-32 fixtures are not yet assigned (notably each Monte Carlo trial). When an authoritative snapshot assignment is available, the existing grounded resolution SHALL take precedence. Where more than one valid matching exists for a combination, the system SHALL choose a deterministic canonical one so results are reproducible.

#### Scenario: Allocation derived from qualifying group letters

- **WHEN** the eight qualifying third-placed teams and their group letters are known and no snapshot Round-of-32 assignment exists
- **THEN** the system assigns each third-placed team to a Round-of-32 slot whose candidate set includes that team's group, consistent with FIFA's Annex C

#### Scenario: Allocation varies with which groups qualify

- **WHEN** two different combinations of group letters qualify among the best eight third-placed teams
- **THEN** the system produces the corresponding distinct assignments, so the third-placed-to-slot mapping reflects the actual qualifying combination

#### Scenario: Valid assignment for every combination

- **WHEN** the allocation is computed for any of the 495 possible combinations of eight qualifying groups
- **THEN** each of the eight third-placed Round-of-32 slots receives exactly one of the eight qualifying teams, none duplicated or omitted, and no team is assigned to a slot outside its candidate group set

#### Scenario: Forced placements are honored

- **WHEN** a qualifying group appears in only one slot's candidate set (e.g. group K, or group L)
- **THEN** the system assigns that group to its sole permitted slot

#### Scenario: Grounded assignment takes precedence

- **WHEN** the snapshot already carries an authoritative Round-of-32 assignment for a third-placed slot
- **THEN** the system uses that grounded assignment rather than the self-computed allocation

#### Scenario: Deterministic canonical choice

- **WHEN** a combination admits more than one valid matching
- **THEN** the system returns the same deterministic assignment every time for that combination

### Requirement: Projected Round-of-32 fill

The system SHALL be able to fill undetermined Round-of-32 slots with the model's most-likely occupants as a fallback, so a complete bracket is available before the real teams are known. Using per-group finishing-position probabilities (`advancement-probability`): a group-winner slot SHALL be filled with that group's most-likely winner, a runner-up slot with its most-likely runner-up, and the third-placed slots with the projected best-eight third-placed teams allocated via the Annex C allocation. The projected occupants of a group SHALL be a coherent assignment (a distinct team per position). Every slot filled this way SHALL be flagged as **projected** rather than presented as an official team.

#### Scenario: Placeholders filled with projected teams

- **WHEN** a bracket is built with projection enabled and a Round-of-32 slot's real occupant is not yet known
- **THEN** the slot is filled with the model's most-likely team for that position and flagged as projected

#### Scenario: Projected group positions are coherent

- **WHEN** a group's winner and runner-up slots are projected
- **THEN** they are filled with two distinct teams (the projected 1st and 2nd of that group), not the same team twice

#### Scenario: Projected thirds use the Annex C allocation

- **WHEN** the projected best-eight third-placed teams are placed
- **THEN** each is assigned to a third-placed Round-of-32 slot via the Annex C allocation, within that slot's candidate groups

### Requirement: Real results take precedence over projection

The system SHALL prefer real resolution over projection: a Round-of-32 slot whose occupant is known from a finalized group or a declared Round-of-32 fixture SHALL show that concrete team (not flagged projected), and only genuinely undetermined slots SHALL be projected. With projection disabled, undetermined slots SHALL remain candidate-set/position placeholders as before.

#### Scenario: Known team is not overridden by projection

- **WHEN** a slot's occupant is already known from real results
- **THEN** the bracket shows the real team and does not mark it projected

#### Scenario: Projection is opt-in

- **WHEN** a bracket is built without projection enabled
- **THEN** undetermined Round-of-32 slots remain placeholders and none are filled with projected teams

