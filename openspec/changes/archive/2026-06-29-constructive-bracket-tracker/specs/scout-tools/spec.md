## MODIFIED Requirements

### Requirement: Prediction evaluation tool

The system SHALL provide a Scout tool that, given a user's bracket picks, returns a grounded evaluation produced by `bracket-prediction-scoring` and `prediction-model-comparison` over the current snapshot. The output SHALL lead with signals that reflect reality: each pick's status (pending/correct/wrong/busted) and model probability, counts of how many picks are still alive vs. busted (picked team eliminated) vs. wrong (decided match lost), the projected (expected) final score, the boldness count, and the upset bonus. Points banked so far MAY be included but SHALL be clearly labelled as points-so-far against the total (not a verdict). The perfect-bracket survival probability (every remaining pick holding) SHALL NOT be included in the output at all, so it cannot be mistaken for the bracket being "still alive" or eliminated. The tool's input SHALL have an explicit, validated schema, and output SHALL be engine-sourced, never free-text the model could mistake for its own computation.

#### Scenario: Returns the grounded bracket evaluation

- **WHEN** the Scout needs facts about the user's bracket and picks are available
- **THEN** the tool returns per-pick statuses and model probabilities, the count of alive/busted/wrong picks, the projected final score, boldness, and upset bonus, computed by the engine

#### Scenario: Perfect-survival is not surfaced as aliveness

- **WHEN** the evaluation is returned for a complete, fully-valid bracket with no busted picks
- **THEN** it reports zero busted picks and does NOT include any perfect-bracket survival probability, so it cannot be read as a "still alive" or elimination signal

#### Scenario: Busted picks are surfaced honestly

- **WHEN** the bracket contains a pick whose team has already been eliminated
- **THEN** the tool reports that pick's status as busted and includes it in the busted count

#### Scenario: No picks available

- **WHEN** the tool is invoked but no picks are in context
- **THEN** it returns a clear "no bracket provided" result the Scout can relay, rather than inventing one

#### Scenario: Invalid picks handled

- **WHEN** the tool is called with picks that are not valid participants or reference unknown matches
- **THEN** it returns a tool error the Scout can relay, not an exception
