## ADDED Requirements

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
