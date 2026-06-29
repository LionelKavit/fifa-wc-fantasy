## MODIFIED Requirements

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

## ADDED Requirements

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
