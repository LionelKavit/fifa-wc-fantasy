## ADDED Requirements

### Requirement: Scout chat on the predictor surface

The predictor surface SHALL include a Scout chat panel that sends the user's current bracket picks and pool size with each message, so the user can ask about their bracket (e.g. "is this pick smart?", "how's my bracket?") next to it. The dashboard's existing Scout chat SHALL remain unchanged (it sends no bracket context). A pool-size control SHALL let the user state how many people are in their pool, included with the bracket context.

#### Scenario: Ask the Scout about the current bracket

- **WHEN** the user types a question in the predictor's chat panel
- **THEN** the message is sent with the current picks and pool size, and the Scout's answer reflects that bracket

#### Scenario: Pool size captured

- **WHEN** the user sets the pool size
- **THEN** it is included with the bracket context sent to the Scout

#### Scenario: Dashboard chat unchanged

- **WHEN** the user uses the chat on the group dashboard
- **THEN** it works as before, sending no bracket context
