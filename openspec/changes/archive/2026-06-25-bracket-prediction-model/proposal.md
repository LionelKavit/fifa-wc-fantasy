## Why

The engine can build the knockout tree and estimate deep-run odds, but fans can't yet *play*. The flagship feature is a Predictor game — fill in the whole bracket, then watch it score against reality (and, later, against the model). Before any of that, we need a sound representation of a fan's filled-in bracket: what a prediction is, what makes it valid, when it's complete, and when it locks. This change defines that pure model — the foundation the scoring (`bracket-prediction-scoring`) and the "you vs. the model" layer build on.

## What Changes

- Introduce a **prediction model**: a fan's chosen winner for every knockout match (Round of 32 → Final), over a concrete `knockout-bracket`.
- Define **path validity / internal consistency**: a team may be picked to win a match only if the prediction also has it winning every earlier-round match on its path to that match — picks propagate up the tree, so the predicted participants of a later match are the predicted winners of its two feeder matches.
- Expose a **completeness state** (empty / partial / complete) and, when complete, the derived bracket (predicted winner per match, per-round survivors, and the predicted champion).
- Define **locking**: a prediction is editable until the first knockout match kicks off, after which it is locked (read-only) for scoring.
- Keep the model **pure and framework-agnostic**: construction, editing (pick/clear a winner with consistent propagation), and validation are pure functions over the bracket, independent of any storage or UI. Persistence is a separate, client concern handled by the predictor UI.

This change is **engine + spec only**: no scoring, no UI, no API, no storage implementation.

## Capabilities

### New Capabilities
- `bracket-prediction`: the pure representation of a fan's filled-in knockout bracket — per-match winner picks with consistent upward propagation, path-validity rules, completeness state, the derived predicted champion, and lock semantics tied to the first knockout kickoff.

### Modified Capabilities
<!-- None. Reads the `knockout-bracket` structure; does not change its requirements. -->

## Impact

- **New engine module** under `lib/engine/` (e.g. `prediction.ts`) plus tests; pure functions over a `Bracket` (from `knockout-bracket`) and `BracketMatch`/`BracketTeamRef` types.
- **Reads** the `knockout-bracket` capability for tree structure and resolved participants; depends on `knockout-bracket-structure`. No change to its requirements.
- **Persistence is out of scope**: where a fan's prediction is stored (local-first, no account for v1) is a client concern owned by the later predictor UI change. This capability only defines the in-memory model and its rules.
- **No** API, UI, dependency, or breaking changes. Establishes the contract `bracket-prediction-scoring` and the predictor UI depend on.
