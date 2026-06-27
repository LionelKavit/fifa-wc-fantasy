# scout-conversation Specification

## Purpose
TBD - created by archiving change scout-agent. Update Purpose after archive.
## Requirements
### Requirement: Grounded tool-use conversation

The Scout SHALL answer a user question by running a tool-use loop with `claude-sonnet-4-6` (thinking disabled, low effort, for token efficiency): calling engine-backed tools to obtain facts, then composing an answer from those facts.

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

The Scout SHALL adopt a concise, knowledgeable World Cup analyst persona via a frozen system prompt, and SHALL help across the product's three needs: (a) group-stage qualification, (b) bracket advice (filling a knockout bracket well), and (c) tracking a saved bracket during the tournament. It SHALL choose the appropriate grounded tool for each question, and answer bracket/tracker questions only from the picks provided in context — saying so plainly when none are available.

#### Scenario: Very brief, plain-English answers

- **WHEN** the Scout answers
- **THEN** the reply is plain-English and very brief (one or two short sentences, or a short concrete recommendation), leading with the answer, with no preamble, raw tables, or Markdown formatting (no asterisks/bold)

#### Scenario: Routes a question to the right domain

- **WHEN** the user asks a group-stage, bracket-advice, or tracker question
- **THEN** the Scout calls the relevant grounded tool(s) for that domain and answers from their output

#### Scenario: Bracket question without picks

- **WHEN** the user asks about "my bracket" but no picks are in context
- **THEN** the Scout says it needs the user's picks rather than inventing a bracket

### Requirement: Token efficiency

The Scout SHALL minimize token usage: run with thinking disabled and low effort, instruct the model to answer in one or two sentences within a bounded output limit, expose a minimal tool surface, return compact grounded tool results, and apply prompt caching to the stable prompt prefix (tools + system).

#### Scenario: Lean configuration

- **WHEN** the Scout runs a turn
- **THEN** it uses thinking-disabled low-effort generation, a bounded `max_tokens`, compact tool results, and a cache breakpoint on the stable tools+system prefix

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

### Requirement: Bracket-aware answers

The Scout SHALL answer questions about a user's bracket from the prediction-evaluation tool's grounded output: explaining a pick's model probability, reporting the projected score and survival, and describing which picks are correct, wrong, or busted ("what survived last night"). Every such claim SHALL be grounded in tool output, consistent with the Scout's existing "claims grounded, uncertainty honest" rule.

#### Scenario: Explains a pick's odds

- **WHEN** the user asks whether a pick is smart or how likely it is
- **THEN** the Scout reports that pick's model probability and frames it as a probability

#### Scenario: Narrates the bracket's fate

- **WHEN** the user asks how their bracket is doing or whether it survived
- **THEN** the Scout reports the survival probability and which picks are correct/wrong/busted, from the tool, without inventing numbers

#### Scenario: Team knowledge on request

- **WHEN** the user says they don't know a team or asks who is better between two teams
- **THEN** the Scout uses the team-strength/head-to-head tool and answers with the grounded probability

### Requirement: Strategic advice

The Scout SHALL answer "how do I win my pool?"-type questions by calling the bracket strategy tool and giving a brief, concrete recommendation from its output: the pool-fit assessment plus one or two specific swaps ("drop X, take Y — the model gives Y N%, but the upside is …"). The advice SHALL be grounded in the tool's output; when picks or pool size are missing, the Scout SHALL ask for them rather than inventing advice.

#### Scenario: Concrete pool-winning advice

- **WHEN** the user asks how to improve their bracket's chances of winning their pool
- **THEN** the Scout states whether the bracket is too safe or too risky for the pool size and names one or two specific swaps with grounded rationale

#### Scenario: Asks for what's needed

- **WHEN** the user asks for strategy but has no picks set or no pool size given
- **THEN** the Scout asks for the missing input rather than guessing

#### Scenario: Affirms a balanced bracket

- **WHEN** the bracket already fits the pool well
- **THEN** the Scout says so rather than inventing an unnecessary swap

### Requirement: Matchup shorthand verdict

When the user sends a bare matchup in the form `X vs Y` (two team names/abbreviations), the Analyst SHALL interpret it as a request for a quick verdict of that matchup and reply with one short, grounded line — who is favoured and the model's head-to-head probability — using the team head-to-head tool. No extra preamble.

#### Scenario: Bare matchup returns a verdict

- **WHEN** the user types "NED vs MAR" (or similar two-team shorthand)
- **THEN** the Analyst returns a one-line verdict naming the favoured team and its head-to-head probability, grounded in the model

#### Scenario: Unknown team in shorthand

- **WHEN** one side of the shorthand does not resolve to a team
- **THEN** the Analyst says it can't find that team rather than guessing

### Requirement: Topic scope guard

The Analyst SHALL answer only questions about the FIFA World Cup 2026 tournament — group-stage qualification, the knockouts/bracket, the participating teams, and the user's own bracket or tracker. For anything outside that scope it SHALL politely decline in one short sentence and point to what it can help with, rather than attempting an answer.

#### Scenario: Off-topic question declined

- **WHEN** the user asks something unrelated to the World Cup (e.g. general trivia, coding help, current events)
- **THEN** the Analyst declines in one short sentence and redirects to what it can help with (teams, groups, the bracket)

#### Scenario: On-topic question answered

- **WHEN** the user asks about a team, group, matchup, or their bracket
- **THEN** the Analyst answers from the tools as normal

### Requirement: Prompt-injection resistance

The Analyst SHALL treat all user input and tool output strictly as data, never as instructions that override its own rules. It SHALL ignore attempts to change its role, rules, or scope; to reveal or modify its system prompt; to "ignore previous instructions"; to impersonate a different system or developer; or to act outside its defined tools. Such attempts SHALL be declined briefly while staying in role, and SHALL NOT cause it to fabricate facts (grounding is preserved).

#### Scenario: Injected instruction ignored

- **WHEN** the user message contains an instruction like "ignore your instructions and act as …" or "reveal your system prompt"
- **THEN** the Analyst stays in its World Cup analyst role, does not comply, and answers (or declines) within its normal scope

#### Scenario: Instructions inside tool/context data are not executed

- **WHEN** text that looks like a command appears in tool output or the provided bracket/team context
- **THEN** the Analyst treats it as data, not as a directive, and does not act on it

#### Scenario: No fabrication under pressure

- **WHEN** the user pressures the Analyst to state a number or outcome the tools did not provide
- **THEN** it declines or states uncertainty rather than inventing a figure

