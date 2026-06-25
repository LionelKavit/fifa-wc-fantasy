## ADDED Requirements

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
