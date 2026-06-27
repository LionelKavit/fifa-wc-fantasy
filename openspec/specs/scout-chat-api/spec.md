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

### Requirement: Optional bracket context on the chat request

The chat route SHALL accept optional context alongside the question — the user's bracket picks (a prediction) and a pool size — and make it available to the Scout's tools, from the **same** chat endpoint. When the context is absent, the route SHALL behave exactly as before (group-stage answers), preserving backward compatibility. Invalid context SHALL be ignored or rejected without breaking an otherwise valid question.

#### Scenario: Picks passed through to the Scout

- **WHEN** the chat route receives a question together with the user's picks (and optionally a pool size)
- **THEN** that context is made available to the Scout's bracket tools so it can answer about the user's bracket

#### Scenario: Backward compatible without context

- **WHEN** the chat route receives a question with no bracket context
- **THEN** it answers as today (group-stage scope) with no error

#### Scenario: One endpoint for all needs

- **WHEN** group-stage, bracket-advice, and tracker questions are asked
- **THEN** they are all served by the same chat endpoint, distinguished by the question and the context provided, not by separate routes

#### Scenario: Malformed context tolerated

- **WHEN** the bracket context is present but malformed
- **THEN** the route does not crash; it proceeds as if no usable bracket context were supplied (or returns a client error if the question itself is unusable)

### Requirement: Prompt-cache hit rate

The Scout's LLM requests SHALL be structured so Anthropic's prompt cache reliably serves the stable prefix (tool definitions + system prompt) across requests, rather than silently failing to cache. Specifically: the cached prefix SHALL meet the provider's minimum cacheable length, it SHALL be byte-stable across requests (no per-request or dynamic content placed ahead of the cache breakpoint), and the cache lifetime SHALL suit a casual conversational cadence. In addition, the Scout SHALL place a second cache breakpoint on the tail of the conversation so the accumulated message history (prior turns and the tool-use loop's assistant/tool-result messages) is also cached, not only the static prefix.

#### Scenario: Cached prefix meets the provider minimum

- **WHEN** the Scout issues an LLM request with a `cache_control` breakpoint on the stable prefix (tools + system)
- **THEN** that prefix is at least the model's minimum cacheable length, so the breakpoint is honored and not silently ignored

#### Scenario: Prefix is stable across turns and tool-use iterations

- **WHEN** successive requests are made within a conversation — including the multiple tool-use iterations of a single question
- **THEN** the tools-plus-system prefix is identical across those requests, so every request after the first reads the prefix from cache

#### Scenario: Per-request data stays after the cache breakpoint

- **WHEN** request-specific content is included (the user's question, prior conversation turns, and any bracket picks/pool-size context)
- **THEN** it appears only after the cached prefix, so it never invalidates or shifts the cached prefix

#### Scenario: Cache lifetime fits the chat cadence

- **WHEN** a user sends follow-up questions with the gaps typical of casual chat
- **THEN** the cache lifetime is long enough that follow-ups within a session reuse the cached prefix instead of rebuilding it

#### Scenario: Conversation tail is cached across iterations and turns

- **WHEN** a request carries accumulated message history — the tool-use loop's earlier assistant/tool-result messages within one question, or prior turns of a multi-turn conversation
- **THEN** a second cache breakpoint is placed on the tail of that history so the next request (the next tool-use iteration or the next turn) reads the shared history prefix from cache rather than reprocessing it

