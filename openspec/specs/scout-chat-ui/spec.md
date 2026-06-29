# scout-chat-ui Specification

## Purpose
TBD - created by archiving change web-ui. Update Purpose after archive.
## Requirements
### Requirement: Chat panel with streaming answers

The UI SHALL provide a Scout chat panel where the user submits a question and sees the answer render incrementally as it streams from the chat API.

#### Scenario: Answer streams into view

- **WHEN** the user submits a question
- **THEN** the answer text appears progressively as it streams, rather than only after completion

### Requirement: Multi-turn history

The chat panel SHALL retain the conversation and send prior turns with each new question so follow-ups are understood in context.

#### Scenario: Follow-up keeps context

- **WHEN** the user asks a follow-up after a prior exchange
- **THEN** the panel sends the prior turns with the new question and displays the running conversation

### Requirement: Answer source indicated

The chat panel SHALL indicate whether an answer came from the Scout (LLM) or the deterministic fallback.

#### Scenario: Fallback labelled

- **WHEN** an answer comes from the deterministic fallback
- **THEN** the panel labels it as such, distinct from a Scout (LLM) answer

### Requirement: Input and error states

The chat panel SHALL prevent empty submissions and surface a friendly message if a request fails.

#### Scenario: Empty input blocked

- **WHEN** the user submits with no text
- **THEN** no request is sent

#### Scenario: Request failure handled

- **WHEN** a chat request fails
- **THEN** the panel shows a friendly error rather than breaking the UI

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

### Requirement: Quick matchup-verdict suggestion

The Analyst chat SHALL offer a suggested prompt that teaches the quick-verdict shortcut — e.g. `Just type "NED vs MAR"` — so a user learns they can type a bare matchup to get a fast verdict. Selecting it SHALL send a matchup query that returns a brief verdict.

#### Scenario: Quick-verdict suggestion shown

- **WHEN** the Analyst chat shows its suggestions (Knockouts tab)
- **THEN** one suggestion teaches the `X vs Y` shortcut for a quick matchup verdict

#### Scenario: Selecting it asks for a verdict

- **WHEN** the user selects the quick-verdict suggestion
- **THEN** a matchup query is sent and the Analyst replies with a brief verdict

