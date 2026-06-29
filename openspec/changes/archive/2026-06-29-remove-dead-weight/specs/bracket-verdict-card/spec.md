## REMOVED Requirements

### Requirement: Pool-finish verdict endpoint

**Reason**: The win %/verdict was removed from the post-bracket panel; `POST /api/predictor/pool-finish` (and its `poolVerdict` helper) is no longer called by the app. The pool-finish *engine* (`evaluatePoolFinish`) remains, used by the bracket-strategy tool and the leverage generator.

### Requirement: Verdict note endpoint

**Reason**: The Analyst-written verdict note was removed from the panel; `POST /api/predictor/verdict-note` and `lib/scout/verdict.ts` are dead.

### Requirement: Verdict note may use expert notes

**Reason**: Tied to the removed verdict-note endpoint; no longer applicable.
