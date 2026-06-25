# scout-chat-api Specification

## Purpose
TBD - created by archiving change web-api. Update Purpose after archive.
## Requirements
### Requirement: Scout chat endpoint

The system SHALL expose a chat route that accepts a user question and optional prior conversation turns, and returns the Scout's answer.

#### Scenario: Question answered

- **WHEN** the chat route receives a question
- **THEN** it runs the Scout and returns its answer

#### Scenario: Conversation history threaded

- **WHEN** the chat route receives prior conversation turns with the question
- **THEN** those turns are passed to the Scout so follow-up questions are understood in context

#### Scenario: Malformed request rejected

- **WHEN** the chat route receives a request without a usable question
- **THEN** it responds with a client error status

### Requirement: Streamed response

The chat route SHALL stream the Scout's answer to the client so tokens render as they arrive.

#### Scenario: Answer streams

- **WHEN** the Scout produces an answer
- **THEN** the route streams the text incrementally to the client rather than only returning it once complete

### Requirement: Keyless fallback over HTTP

When no Anthropic API key is configured, the chat route SHALL return the deterministic grounded answer rather than failing.

#### Scenario: No key configured

- **WHEN** the chat route is called with no API key configured server-side
- **THEN** it returns the deterministic grounded answer and indicates the answer came from the deterministic fallback

### Requirement: Server-side key handling

The Anthropic API key SHALL be read only server-side within the route and never sent to the client.

#### Scenario: Key stays server-side

- **WHEN** the chat route runs
- **THEN** the API key is sourced from server environment and is never included in the response or client bundle

