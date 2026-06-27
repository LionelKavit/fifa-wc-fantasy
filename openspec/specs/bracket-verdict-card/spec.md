# bracket-verdict-card Specification

## Purpose
TBD - created by archiving change bracket-verdict-card. Update Purpose after archive.
## Requirements
### Requirement: Contextual swap by bracket completeness

The post-bracket panel SHALL change with the bracket's completeness. While the bracket is empty or partially filled, it SHALL show the **Build box**: the pool-size input, a risk slider (Safe ↔ Balanced ↔ Bold) with the pool-size-based recommendation surfaced, and a "Build my bracket for me" action. It SHALL NOT show finish numbers while incomplete. Once every knockout match is picked, it SHALL show the verdict card. Changing the pool size SHALL re-evaluate the verdict.

#### Scenario: Incomplete bracket shows the Build box

- **WHEN** the bracket is empty or missing one or more picks
- **THEN** the panel shows the pool-size input, the risk slider with the recommended level surfaced, and a Generate ("Build my bracket for me") action, and no win probability or finish numbers

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

### Requirement: Generate, populate, then tweak

From the Build box, generating SHALL fill the bracket with a complete generated prediction at the chosen risk level and pool size, populating it into the editable bracket tree (and persisting it like manual picks) so the user can change any pick afterward. The generated bracket is a starting point, not a locked result; once complete it flows into the verdict card. If the user already has picks, the panel SHALL confirm before overwriting them.

#### Scenario: Generate fills an editable bracket

- **WHEN** the user picks a risk level and triggers Generate on an empty bracket
- **THEN** the bracket is populated with a complete generated prediction, every pick remains editable in the tree, and the panel then shows the verdict

#### Scenario: Tweaks are preserved

- **WHEN** the user edits a pick after generating
- **THEN** the edit replaces only that pick (and any now-infeasible downstream picks per the existing bracket rules), and the verdict updates

#### Scenario: Overwrite is confirmed

- **WHEN** the user triggers Generate while the bracket already has one or more picks
- **THEN** the panel asks the user to confirm before replacing the existing picks

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

### Requirement: Verdict note may use expert notes

When generating the Analyst verdict note, the system SHALL include relevant untrusted expert notes about the bracket's notable teams (e.g. the champion and finalists, identified from the picks the card already holds) when such notes exist. The notes SHALL be passed as labeled reference **data, never instructions**, and SHALL NOT introduce numbers beyond the supplied verdict facts; the sentence stays grounded in the facts and may add qualitative color. When there are no relevant notes (the default placeholder state), the verdict note SHALL be exactly as it is without knowledge sources.

#### Scenario: Notes inform the verdict when present

- **WHEN** the verdict note is generated and relevant expert notes exist for the bracket's notable teams
- **THEN** those notes are provided to the Analyst as labeled untrusted reference, and the one-line verdict may reflect them while staying grounded in the verdict facts

#### Scenario: No notes leaves the verdict unchanged

- **WHEN** no relevant expert notes exist
- **THEN** the verdict note is identical to the no-knowledge behavior

#### Scenario: Notes do not add fabricated numbers

- **WHEN** an expert note contains a figure or a directive
- **THEN** the verdict sentence does not adopt that figure as a grounded number and does not act on the directive

### Requirement: In-place rebuild controls

Once the bracket is complete, the verdict card SHALL offer a rebuild control without requiring the user to clear the bracket first: a **Regenerate** action, a **Bolder** action, and a **Safer** action, with the current risk level shown. Regenerate SHALL re-run the generator at the current risk with a new seed, producing a freshly-generated valid bracket (which may differ, to the extent the risk/pool leaves room for different upset choices — at the safest/smallest settings the best bracket is essentially forced, so it may repeat). Bolder/Safer SHALL shift the risk one level along safe → balanced → bold (Bolder) or the reverse (Safer) and regenerate; the action at the end of the range SHALL be disabled (Bolder disabled at "bold", Safer at "safe"). The pool size SHALL be preserved across rebuilds. Each rebuild SHALL repopulate the editable bracket (so the tree updates and the verdict re-evaluates).

#### Scenario: Regenerate re-runs at the current risk with a new seed

- **WHEN** the user clicks Regenerate on a complete bracket
- **THEN** the generator re-runs at the current risk with a new seed and the resulting bracket repopulates the tree and re-evaluates the verdict (differing where the risk/pool allows different upset choices)

#### Scenario: Bolder and Safer shift the risk

- **WHEN** the user clicks Bolder (or Safer)
- **THEN** the risk shifts one level toward bold (or safe), the bracket is regenerated at the new risk, and the shown risk level updates

#### Scenario: Range ends are disabled

- **WHEN** the current risk is "bold" (or "safe")
- **THEN** the Bolder (or Safer) action is disabled

#### Scenario: Rebuild replaces the bracket and stays editable

- **WHEN** a rebuild completes
- **THEN** the new picks populate the editable bracket tree (the user can still tweak them) and the pool size is unchanged

### Requirement: Rebuild feedback

A rebuild SHALL show a loading state while generating and an error state on failure, leaving the existing bracket in place if the rebuild fails. Rebuild actions explicitly replace the current bracket and SHALL NOT require a per-click confirmation.

#### Scenario: Loading during a rebuild

- **WHEN** a rebuild request is in flight
- **THEN** the control shows a loading state

#### Scenario: Failure leaves the bracket intact

- **WHEN** a rebuild request fails
- **THEN** an error is shown and the current bracket remains unchanged

### Requirement: Optimize-for-win-probability generation option

The Build box SHALL offer an "Optimize for win %" option alongside the risk slider that generates the bracket with the leverage strategy instead of the heuristic. Because it is slower, choosing it SHALL show a loading state while it runs; on success it SHALL populate the editable bracket exactly like a normal generate (so the verdict re-evaluates), and on failure it SHALL show an error and leave the current bracket unchanged.

#### Scenario: Optimize produces and populates a bracket

- **WHEN** the user chooses "Optimize for win %" and runs generation
- **THEN** the leverage strategy runs (with a loading state), the resulting picks populate the editable bracket, and the verdict re-evaluates

#### Scenario: Heuristic remains the default

- **WHEN** the user generates without choosing the optimize option
- **THEN** the fast heuristic bracket is produced exactly as before

#### Scenario: Failure leaves the bracket intact

- **WHEN** an optimize run fails
- **THEN** an error is shown and the current bracket is unchanged

