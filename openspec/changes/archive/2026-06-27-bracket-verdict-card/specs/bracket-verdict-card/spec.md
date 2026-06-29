## ADDED Requirements

### Requirement: Contextual swap by bracket completeness

The post-bracket panel SHALL change with the bracket's completeness. While the bracket is empty or partially filled, it SHALL show a prompt state containing the pool-size input and a short message inviting the user to finish the bracket, and SHALL NOT show finish numbers. Once every knockout match is picked, it SHALL show the verdict card. Changing the pool size SHALL re-evaluate the verdict.

#### Scenario: Incomplete bracket shows the prompt

- **WHEN** the bracket is empty or missing one or more picks
- **THEN** the panel shows the pool-size input and a "finish your bracket to see if it'll win your pool" prompt, and no win probability or finish numbers

#### Scenario: Complete bracket shows the verdict

- **WHEN** every knockout match is picked
- **THEN** the panel shows the verdict card

#### Scenario: Pool size drives the verdict

- **WHEN** the user changes the pool size on a complete bracket
- **THEN** the verdict is re-evaluated for the new pool size

### Requirement: "Will this win my pool?" hero

When the bracket is complete, the verdict card SHALL lead with the bracket's standing in the user's pool: its win probability and its projected finishing position, phrased for a casual fan and naming the pool size.

#### Scenario: Win odds and finish are the hero

- **WHEN** the verdict card renders for a complete bracket
- **THEN** the win probability and projected finish in the pool are the prominent headline (e.g. "about a 12% chance to win your pool of 20" and "projected to finish ~5th of 20")

### Requirement: You versus the model

The verdict card SHALL show the user's win probability alongside the model's most-likely ("chalk") bracket's win probability in the same pool, so the effect of deviating from chalk is visible.

#### Scenario: Chalk reference shown beside the user's odds

- **WHEN** the verdict card renders
- **THEN** the user's win probability is shown next to the chalk bracket's win probability for the same pool size

### Requirement: Likely points range

The verdict card SHALL show a likely range for the user's own score (a low–high band from the evaluator's percentiles), not only a single point estimate.

#### Scenario: Range, not a single number

- **WHEN** the verdict card renders
- **THEN** it shows a points range (e.g. p10–p90 of the user's score), conveying the spread rather than one figure

### Requirement: Plain-language verdict

The verdict card SHALL include a short, plain-language sentence summarizing the outlook, derived deterministically from the numbers (a template, not an LLM). It SHALL read as friendly advice (boldness and win odds versus chalk), not a stats dump.

#### Scenario: Template verdict sentence

- **WHEN** the verdict card renders for a complete bracket
- **THEN** it shows a one-sentence plain-language read derived from the win probability, finish, and how the bracket compares to chalk

#### Scenario: Deterministic, no model call

- **WHEN** the verdict sentence is produced
- **THEN** it is generated from the numbers without any LLM call

### Requirement: Pool-finish verdict endpoint

The system SHALL expose a server endpoint that accepts the user's picks and a pool size and returns the verdict payload — the user's win probability, projected finish, and points range, plus the chalk reference's win probability — computed server-side (the Monte Carlo never runs in the browser). For an incomplete bracket it SHALL return an explicit incomplete signal rather than numbers. Malformed requests SHALL get a client-error response.

#### Scenario: Verdict for a complete bracket

- **WHEN** the endpoint receives complete picks and a pool size
- **THEN** it returns the user's win probability, projected finish, and points range, plus the chalk bracket's win probability

#### Scenario: Incomplete bracket returns the incomplete signal

- **WHEN** the endpoint receives an incomplete set of picks
- **THEN** it returns an explicit incomplete signal and no finish numbers

#### Scenario: Malformed request rejected

- **WHEN** the endpoint receives a body without usable picks or pool size
- **THEN** it responds with a client-error status

### Requirement: Complete-only, grounded framing

The verdict SHALL be shown only for a complete bracket, SHALL display the pool size it was computed for, and SHALL reflect the grounded model (the Phase 1 scoring scheme and the modeled chalk-biased opponent field) rather than invented numbers. While the verdict is being computed or if it fails, the card SHALL show a loading or error state rather than a stale or fabricated figure.

#### Scenario: Pool size is shown with the verdict

- **WHEN** the verdict renders
- **THEN** the pool size it was computed for is shown alongside the odds

#### Scenario: Loading and error states

- **WHEN** the verdict is being computed, or the request fails
- **THEN** the card shows a loading indicator or an error message rather than a stale or made-up figure
