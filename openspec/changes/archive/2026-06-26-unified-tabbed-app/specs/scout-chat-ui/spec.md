## RENAMED Requirements

- FROM: `### Requirement: Scout chat on the predictor surface`
- TO: `### Requirement: Shared tab-aware Scout chat`

## MODIFIED Requirements

### Requirement: Shared tab-aware Scout chat

The app SHALL provide a single Scout chat panel shared across the Group stage and Knockouts tabs, rather than a separate chat per surface. It SHALL persist across tab switches (the conversation is retained) and SHALL send context appropriate to the active tab: the current bracket picks and pool size when the Knockouts tab is active, and no bracket context on the Group stage tab. A pool-size control (on the Knockouts tab) SHALL let the user state how many people are in their pool, included with the bracket context.

#### Scenario: One chat across both tabs

- **WHEN** the user switches between the Group stage and Knockouts tabs
- **THEN** the same chat panel and its conversation remain, not a separate chat per tab

#### Scenario: Knockouts tab sends bracket context

- **WHEN** the user asks a question while the Knockouts tab is active
- **THEN** the message includes the current picks and pool size, and the answer reflects that bracket

#### Scenario: Group stage tab sends no bracket context

- **WHEN** the user asks a question while the Group stage tab is active
- **THEN** the message includes no bracket context and is answered in group-stage scope

#### Scenario: Pool size captured

- **WHEN** the user sets the pool size on the Knockouts tab
- **THEN** it is included with the bracket context sent to the Scout
