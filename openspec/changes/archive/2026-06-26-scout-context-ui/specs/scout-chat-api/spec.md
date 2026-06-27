## ADDED Requirements

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
