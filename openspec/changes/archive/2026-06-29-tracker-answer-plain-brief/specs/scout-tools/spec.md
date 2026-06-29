## MODIFIED Requirements

### Requirement: Prediction evaluation tool

The system SHALL provide a Scout tool that, given a user's bracket picks, returns a grounded evaluation produced by `bracket-prediction-scoring` and `prediction-model-comparison` over the current snapshot. The output SHALL lead with signals that reflect reality: each pick's status (pending/correct/wrong/busted), model probability, and a **human round label** (e.g. "Round of 32", "Quarter-final") — never the internal match id — plus counts of how many picks are still alive vs. busted (picked team eliminated) vs. wrong (decided match lost), the boldness count, and the upset bonus. Points banked so far MAY be included but SHALL be clearly labelled as points-so-far against the total (not a verdict). The tool SHALL NOT include the projected (expected) final score, and SHALL NOT include the perfect-bracket survival probability — neither is user-interpretable as a verdict. The tool's input SHALL have an explicit, validated schema, and output SHALL be engine-sourced, never free-text the model could mistake for its own computation.

#### Scenario: Returns the grounded bracket evaluation

- **WHEN** the Scout needs facts about the user's bracket and picks are available
- **THEN** the tool returns per-pick statuses, model probabilities, and round labels, the count of alive/busted/wrong picks, boldness, and upset bonus, computed by the engine

#### Scenario: Picks identified by round, not match id

- **WHEN** the evaluation lists the user's picks
- **THEN** each pick carries a human round label (Round of 32 … Final) and the picked team, and the raw internal match id is not surfaced for the Analyst to quote

#### Scenario: No projected score or perfect-survival

- **WHEN** the evaluation is returned
- **THEN** it includes neither the projected (expected) final score nor the perfect-bracket survival probability, so neither can be quoted as a verdict

#### Scenario: Busted picks are surfaced honestly

- **WHEN** the bracket contains a pick whose team has already been eliminated
- **THEN** the tool reports that pick's status as busted and includes it in the busted count

#### Scenario: No picks available

- **WHEN** the tool is invoked but no picks are in context
- **THEN** it returns a clear "no bracket provided" result the Scout can relay, rather than inventing one

#### Scenario: Invalid picks handled

- **WHEN** the tool is called with picks that are not valid participants or reference unknown matches
- **THEN** it returns a tool error the Scout can relay, not an exception
