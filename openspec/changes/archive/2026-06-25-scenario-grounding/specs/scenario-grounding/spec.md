## ADDED Requirements

### Requirement: Team situation assembly

The system SHALL assemble, for a given team, a structured `TeamSituation` joining its current standings position, its top-2 verdict and overall advancement status, the results it needs, its rivals, and the decisive remaining fixtures — sourced from the deterministic engine and (when supplied) the probabilistic engine.

#### Scenario: Situation reflects engine outputs

- **WHEN** a team situation is built
- **THEN** it carries the team's current rank, points and goal difference, its `topTwo` verdict, its `advancement` status, and (if a simulation is supplied) its advancement probability

#### Scenario: Required results surfaced for alive teams

- **WHEN** a team is still alive for the top 2 and has a remaining fixture
- **THEN** the situation surfaces the per-result effect (win/draw/loss → clinch/depends/eliminated) from the verdict

#### Scenario: Probability included only when simulation supplied

- **WHEN** no simulation/advancement report is supplied
- **THEN** the situation includes verdict-based facts and omits probability fields rather than computing a simulation itself

### Requirement: Group situation assembly

The system SHALL assemble a `GroupSituation` for a group: the ordered standings, each team's situation, and which places are already decided.

#### Scenario: Group situation lists every team

- **WHEN** a group situation is built
- **THEN** it contains an ordered table and a `TeamSituation` for all four teams

### Requirement: Deterministic plain-English narration

The system SHALL produce a short plain-English narration (one to three sentences) for each team and group, derived purely from the structured situation with no LLM, accurately reflecting clinched / eliminated / required-result / probability facts.

#### Scenario: Clinched team narrated as secured

- **WHEN** a team has clinched a top-2 place
- **THEN** its narration states the place is secured and does not describe it as still needing a result

#### Scenario: Required result narrated

- **WHEN** an alive team needs a specific result to guarantee advancement
- **THEN** the narration states that result (e.g. a win guarantees, a draw may suffice)

#### Scenario: Narration matches structured facts

- **WHEN** narration is generated
- **THEN** every claim in it corresponds to a field in the structured situation (no fact appears in prose that is absent from the data)

### Requirement: Grounding accessor

The system SHALL expose `buildTeamSituation(...)` and `buildGroupSituation(...)` accessors returning the structured situation plus its narration, usable as LLM grounding context and as a standalone non-LLM explainer.

#### Scenario: Accessor returns structure and narration together

- **WHEN** a grounding accessor is called
- **THEN** it returns both the structured situation object and its plain-English narration
