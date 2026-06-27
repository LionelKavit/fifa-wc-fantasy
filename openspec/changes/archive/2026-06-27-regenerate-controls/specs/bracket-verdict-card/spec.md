## ADDED Requirements

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
