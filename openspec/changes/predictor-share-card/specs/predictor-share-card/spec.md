## ADDED Requirements

### Requirement: Shareable bracket card

The system SHALL generate a shareable image card summarizing a fan's bracket: the predicted champion, the headline survival probability, the round-weighted and contrarian scores, and the divergence from the model's chalk bracket. The card SHALL use the app's original styling and SHALL NOT include FIFA logos or imagery.

#### Scenario: Card shows the headline figures

- **WHEN** a card is generated for a prediction
- **THEN** it displays the predicted champion, the survival probability, the score(s), and the you-vs-the-model divergence

#### Scenario: Original styling only

- **WHEN** a card is rendered
- **THEN** it uses original styling and contains no FIFA logos or trademarked imagery

### Requirement: Deterministic and self-contained card

The card SHALL be deterministic: the same prediction over the same snapshot SHALL produce the same card. The card SHALL be reachable via a stable shareable representation that encodes the prediction, so the same link reproduces the same card and is suitable for link previews.

#### Scenario: Same prediction yields the same card

- **WHEN** a card is generated twice for the same prediction and snapshot
- **THEN** the two cards are identical

#### Scenario: Shareable representation reproduces the card

- **WHEN** the shareable representation (encoding the prediction) is opened
- **THEN** it renders the corresponding card

### Requirement: Numbers grounded in the engine

The figures on the card SHALL come from the prediction-evaluation engine (`bracket-prediction-scoring` and `prediction-model-comparison`) for the relevant snapshot, not be recomputed or estimated independently, so the card cannot disagree with what the predictor shows.

#### Scenario: Card matches the predictor

- **WHEN** a card is generated for a prediction
- **THEN** its survival, scores, and divergence match the predictor's evaluation of the same prediction and snapshot
