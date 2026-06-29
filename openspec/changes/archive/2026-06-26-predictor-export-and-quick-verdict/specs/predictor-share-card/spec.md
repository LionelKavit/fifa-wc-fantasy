## ADDED Requirements

### Requirement: Champion-centric card design

The share card SHALL be a polished, champion-centric layout: the predicted **champion** is the dominant element, accompanied by the **Final Four** (the four semifinalists) and the key figures (projected score, still-alive probability, upset count), styled in the WC 2026 theme (gold/green on a dark base). It SHALL use original styling only — no FIFA logos or imagery.

#### Scenario: Champion and Final Four shown

- **WHEN** a card is generated for a prediction with a chosen champion
- **THEN** the champion is the dominant element and the four semifinalists are shown alongside the headline figures

#### Scenario: Graceful when incomplete

- **WHEN** the prediction has no champion yet
- **THEN** the card still renders with the available figures (champion shown as not-yet-picked) rather than failing

### Requirement: Downloadable as PNG

The share card SHALL be downloadable as a `.png` file from the predictor (not only openable in a browser tab), so a fan can save and post it.

#### Scenario: Image downloads as a file

- **WHEN** the user chooses the image export
- **THEN** a PNG file of the card is downloaded to their device
