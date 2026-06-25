## ADDED Requirements

### Requirement: Grounded tool-use conversation

The Scout SHALL answer a user question by running a tool-use loop with `claude-sonnet-4-6` and adaptive thinking: calling engine-backed tools to obtain facts, then composing an answer from those facts.

#### Scenario: Question answered via tools

- **WHEN** a user asks what a team needs to advance
- **THEN** the Scout calls the relevant tool(s) and answers using the returned grounded facts

#### Scenario: Loop terminates

- **WHEN** the model stops requesting tools (end of turn)
- **THEN** the conversation loop ends and returns the final answer

### Requirement: Claims grounded, uncertainty honest

The Scout SHALL base every qualification or probability claim on tool output, distinguish certainty (clinched/eliminated) from probability, and decline to answer — rather than guess — when the engine cannot supply the fact.

#### Scenario: Probability stated as probability

- **WHEN** the Scout reports a contended team's chances
- **THEN** it presents a probability (and, where useful, the win/draw/loss conditional) rather than asserting a certain outcome

#### Scenario: Certainty stated as certainty

- **WHEN** a team has clinched or is eliminated
- **THEN** the Scout states it as settled, not as a probability

#### Scenario: Out-of-scope or unknowable question

- **WHEN** the user asks something the engine cannot answer (e.g. a knockout-bracket prediction or an unrelated topic)
- **THEN** the Scout says it cannot answer that rather than fabricating a result

### Requirement: Persona and scope

The Scout SHALL adopt a concise, knowledgeable World Cup analyst persona via a frozen system prompt, and stay scoped to the 2026 group-stage qualification domain.

#### Scenario: Concise, plain-English answers

- **WHEN** the Scout answers
- **THEN** the reply is plain-English and concise, explaining the scenario rather than dumping raw tables

### Requirement: Multi-turn conversation

The system SHALL accept prior conversation turns (user and assistant) and include them in the request ahead of the new question, so follow-up questions are interpreted in the context of the conversation. With no prior turns supplied, it SHALL behave as a single-turn answer.

#### Scenario: Follow-up uses prior context

- **WHEN** a question is asked with prior conversation turns supplied
- **THEN** those turns are included in the model request ahead of the new question, so a follow-up that refers back (e.g. "what about their group?") can be understood

#### Scenario: No history behaves as single-turn

- **WHEN** no prior turns are supplied
- **THEN** the Scout answers the question on its own with no carried context

#### Scenario: Fallback uses recent context best-effort

- **WHEN** the deterministic fallback is active and the current question is a follow-up that refers back to the conversation (e.g. "what are their chances?") but names no team or group
- **THEN** it resolves the most recent team or group mentioned in the prior turns, if any

#### Scenario: Fallback does not dredge history for unrelated messages

- **WHEN** the deterministic fallback is active and the message names no team or group and does not refer back (e.g. a greeting like "hello")
- **THEN** it returns the graceful default rather than the most recent team from history

### Requirement: Streaming responses

The Scout SHALL stream its final response so a chat UI can render tokens as they arrive.

#### Scenario: Tokens stream

- **WHEN** the Scout produces its answer
- **THEN** the answer is available as a stream of incremental text, with a way to obtain the final complete message

### Requirement: Deterministic fallback without an API key

When no Anthropic API key is configured, the system SHALL answer from the deterministic grounded narration instead of calling the model: it SHALL resolve any team or group named in the question and return that situation's narration, and SHALL indicate the answer came from the deterministic fallback rather than the LLM.

#### Scenario: Team question answered offline

- **WHEN** no API key is configured and the user names a team
- **THEN** the Scout returns that team's grounded narration without calling the model, flagged as the deterministic fallback

#### Scenario: Group question answered offline

- **WHEN** no API key is configured and the user names a group
- **THEN** the Scout returns that group's grounded narration without calling the model

#### Scenario: Nothing resolves offline

- **WHEN** no API key is configured and the question names no recognizable team or group
- **THEN** the Scout returns a graceful message describing what it can answer, rather than erroring

### Requirement: Server-side credentials

The Anthropic API key SHALL be read from server-side configuration only and never be committed or exposed to the client.

#### Scenario: Key not exposed

- **WHEN** the Scout runs
- **THEN** the API key is sourced from server-side environment configuration and never sent to or embedded in client code
