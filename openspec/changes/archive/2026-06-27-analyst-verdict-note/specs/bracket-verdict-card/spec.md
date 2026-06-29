## MODIFIED Requirements

### Requirement: Plain-language verdict

The verdict card SHALL include a short, plain-language sentence summarizing the outlook. When an Anthropic API key is configured, the sentence SHALL be **Analyst-written**: a single short plain-text sentence in the Analyst's voice, grounded strictly in the supplied numbers (win probability, the chalk/you-vs-the-model win probability, projected finish, pool size, points range), with no invented numbers and no preamble. When no key is configured, or the Analyst note is unavailable or fails, the card SHALL show the deterministic **template** sentence instead. The card SHALL indicate which source produced the sentence (Analyst vs. template). The template logic SHALL be a pure shared function used by both the client's immediate render and the server's fallback.

#### Scenario: Analyst-written when a key is available

- **WHEN** the verdict card renders for a complete bracket and a key is configured
- **THEN** the sentence is written by the Analyst, grounded in the card's numbers, in one short plain-text sentence

#### Scenario: Template fallback when keyless or failed

- **WHEN** no key is configured, or the Analyst note request fails
- **THEN** the card shows the deterministic template sentence derived from the same numbers

#### Scenario: Source is indicated

- **WHEN** the sentence is shown
- **THEN** the card indicates whether it was written by the Analyst or is the template fallback

## ADDED Requirements

### Requirement: Non-blocking Analyst verdict note

The Analyst sentence SHALL NOT block or delay the verdict card's numbers. The card SHALL display the template sentence immediately once the numbers are available, then fetch the Analyst note asynchronously and swap it in when it arrives. A failed or absent note SHALL leave the template sentence in place; the numbers and the rest of the card SHALL never be gated on the note.

#### Scenario: Numbers show before the note

- **WHEN** the verdict numbers are ready but the Analyst note has not returned yet
- **THEN** the card already shows the win odds, finish, range, and the template sentence, without waiting for the note

#### Scenario: Note swaps in when ready

- **WHEN** the Analyst note returns successfully
- **THEN** the card replaces the template sentence with the Analyst sentence and marks it as Analyst-written

#### Scenario: Failure is silent

- **WHEN** the Analyst note request fails or times out
- **THEN** the card keeps the template sentence and shows no error in place of the verdict

### Requirement: Verdict note endpoint

The system SHALL expose a server endpoint that accepts the verdict facts (win probability, chalk win probability, projected finish, pool size, points range) and returns a verdict sentence with its source. The Anthropic key SHALL be read only server-side and never sent to the client. The endpoint SHALL validate the facts, return the Analyst sentence when keyed, and return the deterministic template sentence (tagged as such) when no key is configured. The sentence SHALL be grounded strictly in the supplied facts and SHALL NOT introduce numbers the facts did not provide.

#### Scenario: Analyst sentence for valid facts with a key

- **WHEN** the endpoint receives valid facts and a key is configured
- **THEN** it returns an Analyst-written sentence grounded in those facts, tagged as Analyst-sourced

#### Scenario: Deterministic sentence without a key

- **WHEN** the endpoint receives valid facts and no key is configured
- **THEN** it returns the template sentence tagged as the deterministic fallback

#### Scenario: Malformed facts rejected

- **WHEN** the endpoint receives a body without usable verdict facts
- **THEN** it responds with a client-error status

#### Scenario: Grounded, no fabricated numbers

- **WHEN** the Analyst sentence is produced
- **THEN** it references only the supplied figures and does not invent standings, odds, or scores
