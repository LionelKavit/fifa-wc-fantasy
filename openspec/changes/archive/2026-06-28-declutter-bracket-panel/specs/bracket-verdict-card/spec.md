## ADDED Requirements

### Requirement: Persistent bracket-settings panel

The post-bracket panel SHALL be a single persistent "Your bracket settings" box that is shown regardless of the bracket's completeness (empty, partial, or complete). It SHALL contain: an approximate pool-size input, a "Choose risk level" slider (Safe ↔ Balanced ↔ Bold), an autofill action ("Build my bracket for me", labeled as a rebuild once the bracket already has picks), a picks counter (e.g. "12/31 picks made — you can edit every pick after"), and a "Clear bracket" action. The panel SHALL NOT swap to a different view when the bracket becomes complete. The Lock & Export box SHALL remain below it, gated on completeness as before.

The introductory copy SHALL read "Need help filling your bracket?" followed by "Autofill with the Analyst – then tweak any pick."

#### Scenario: Settings box persists when complete

- **WHEN** the bracket is empty, partially filled, or fully complete
- **THEN** the "Your bracket settings" box remains visible with the pool-size input, the risk slider, the build/rebuild action, and Clear bracket

#### Scenario: Action label reflects state

- **WHEN** the bracket is empty
- **THEN** the primary action reads "Build my bracket for me"; once the bracket already has picks the action presents as a rebuild

### Requirement: Pool size as an in-panel boldness input

The pool-size field SHALL appear inside the settings box (not in a header), introduced by a prompt to enter an **approximate** pool size, and SHALL default to **20**. Helper text SHALL explain that it helps the model gauge how much risk to take (it tunes how bold the autofilled bracket is) — e.g. "How many people are in your pool? Helps model measure risk." Pool size SHALL be used only to influence the autofill's boldness; it SHALL NOT drive any displayed number or verdict.

#### Scenario: Default and placement

- **WHEN** the settings box renders
- **THEN** the pool-size input is inside the box with an "approximate pool size" prompt and defaults to 20

#### Scenario: Pool size tunes autofill only

- **WHEN** the user changes the pool size and autofills
- **THEN** the generated bracket reflects the pool size's boldness budget, and no verdict or percentage is shown as a result

### Requirement: Choose risk level without a recommendation

The settings box SHALL show a plain "Choose risk level" label above the risk slider and SHALL NOT show any pool-size-based recommendation text. The slider SHALL keep the Safe/Balanced/Bold levels and MAY indicate the currently selected level (without a "recommended" annotation).

#### Scenario: No recommendation shown

- **WHEN** the settings box renders at any pool size
- **THEN** a "Choose risk level" label is shown above the slider and no "recommended" risk text appears

### Requirement: No verdict, percentages, or Analyst note in the panel

The panel SHALL NOT display a win probability, a You-vs-the-model comparison, a projected finish, a likely-points range, or an Analyst/template verdict sentence at any point. A completed bracket SHALL leave the user with the filled bracket, the persistent settings box, and Lock & Export — and nothing else. (Any "is this good?" question is handled by the Scout chat, not this panel.)

#### Scenario: Completed bracket shows no numbers

- **WHEN** the bracket is complete
- **THEN** the panel shows no win %, finish position, points range, You-vs-model, or verdict sentence — only the settings box and the export controls

## MODIFIED Requirements

### Requirement: Generate, populate, then tweak

From the settings box, the autofill action SHALL fill the bracket with a complete generated prediction at the chosen risk level and pool size, populating it into the editable bracket tree (and persisting it like manual picks) so the user can change any pick afterward. The generated bracket is a starting point, not a locked result. If the user already has picks, the panel SHALL confirm before overwriting them. No verdict is shown as a result of generating or editing.

#### Scenario: Autofill fills an editable bracket

- **WHEN** the user picks a risk level and triggers autofill on an empty bracket
- **THEN** the bracket is populated with a complete generated prediction and every pick remains editable in the tree

#### Scenario: Tweaks are preserved

- **WHEN** the user edits a pick after autofilling
- **THEN** the edit replaces only that pick (and any now-infeasible downstream picks per the existing bracket rules), with no verdict recomputation

#### Scenario: Overwrite is confirmed

- **WHEN** the user triggers autofill while the bracket already has one or more picks
- **THEN** the panel asks the user to confirm before replacing the existing picks

### Requirement: In-place rebuild controls

Rebuilding SHALL happen in place via the persistent settings box: the user adjusts the risk slider and/or pool size and presses the build/rebuild action, without clearing the bracket first. Each build SHALL re-run the generator at the current risk and pool size with a fresh seed, so repeated builds may yield a different valid bracket (at the safest/smallest settings the best bracket is essentially forced, so it may repeat). There SHALL be no separate Regenerate, Bolder, or Safer buttons — the slider sets the risk and the build action re-rolls. Each rebuild SHALL repopulate the editable bracket tree, and the pool size and risk SHALL be whatever the controls currently show.

#### Scenario: Rebuild re-runs at the current settings

- **WHEN** the user presses build/rebuild on an existing bracket
- **THEN** the generator re-runs at the current risk and pool size with a new seed and the resulting bracket repopulates the tree (differing where the risk/pool allows different upset choices)

#### Scenario: Risk is changed via the slider

- **WHEN** the user moves the risk slider and rebuilds
- **THEN** the bracket is regenerated at the newly selected risk level

#### Scenario: Rebuild replaces the bracket and stays editable

- **WHEN** a rebuild completes
- **THEN** the new picks populate the editable bracket tree (the user can still tweak them)

### Requirement: Rebuild feedback

A build or rebuild SHALL show a loading state while generating and an error state on failure, leaving the existing bracket in place if it fails. The build/rebuild action explicitly replaces the current bracket and SHALL NOT require a per-click confirmation beyond the overwrite confirmation when picks already exist.

#### Scenario: Loading during a build

- **WHEN** a build/rebuild request is in flight
- **THEN** the control shows a loading state

#### Scenario: Failure leaves the bracket intact

- **WHEN** a build/rebuild request fails
- **THEN** an error is shown and the current bracket remains unchanged

## REMOVED Requirements

### Requirement: Contextual swap by bracket completeness

**Reason**: The panel no longer swaps views by completeness; it is a single persistent settings box (see "Persistent bracket-settings panel").
**Migration**: None — the Build box becomes the always-on settings box; the verdict view is removed.

### Requirement: "Will this win my pool?" hero

**Reason**: Win probability and projected finish are no longer shown — the verdict raised more questions than it answered for casual users.
**Migration**: None — users export the filled bracket; "is this good?" is handled by the Scout chat.

### Requirement: You versus the model

**Reason**: The user-vs-chalk win-probability comparison is part of the removed verdict.
**Migration**: None.

### Requirement: Likely points range

**Reason**: The points-range band is part of the removed verdict.
**Migration**: None.

### Requirement: Plain-language verdict

**Reason**: The verdict sentence (Analyst or template) is part of the removed verdict view.
**Migration**: None — the verdict-note endpoint remains server-side but is no longer rendered by the panel.

### Requirement: Non-blocking Analyst verdict note

**Reason**: The in-card Analyst note is removed along with the verdict.
**Migration**: None.

### Requirement: Complete-only, grounded framing

**Reason**: This described how/when the verdict was shown; with no verdict it no longer applies.
**Migration**: None — the panel shows no computed figures at all.

### Requirement: Optimize-for-win-probability generation option

**Reason**: The "Optimize for win %" toggle is removed from the panel; autofill uses the default heuristic generator.
**Migration**: None — the leverage strategy remains available server-side via the generate endpoint's `strategy` parameter, just not exposed in the UI.
