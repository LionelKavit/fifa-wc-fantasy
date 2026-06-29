## Context

`knockout-bracket` produces a `Bracket` of 31 `BracketMatch`es (R32→Final), each with two slots and feeders (`group` / `thirdPlace` / `matchWinner`) and, once resolved, concrete `BracketTeamRef`s. A prediction is a fan's overlay on that structure: pick a winner per match, with later-round participants determined by earlier picks. This change is the pure model; scoring and UI come later.

## Goals / Non-Goals

**Goals:**
- A pure prediction value + pure `pick`/`clear` operations with consistent upward propagation.
- Path-validity rules enforced by construction (can't pick a non-participant).
- Completeness state and a derived champion when complete.
- Lock derived from the snapshot's first knockout kickoff.

**Non-Goals:**
- Scoring against reality (next change, `bracket-prediction-scoring`).
- Persistence/serialization storage, accounts, sharing — client concerns for the predictor UI.
- Any UI/API.
- Predicting group-stage results — the game starts at the knockout bracket.

## Decisions

**1. Store picks as `matchId → teamId`, derive everything else.**
A `Prediction` is a sparse map from match id to the picked winning team id. Predicted participants of a match are computed from the bracket structure + picks (R32 participants from the bracket's resolved slots; later rounds from the feeder matches' picks). Deriving rather than storing participants keeps the prediction minimal and impossible to make internally inconsistent. Alternative — storing full per-match participant pairs — duplicates state that can drift. Rejected.

**2. `pick(prediction, bracket, matchId, teamId)` validates against *currently predicted* participants and cascades.**
A pick is accepted only if `teamId` is one of the match's predicted participants. After accepting, any later pick whose match no longer has that team (or whose participants changed such that the existing pick is no longer a participant) is cleared, recursively up the tree. This guarantees the invariant "a team wins a later match only if it won all earlier matches on its path" holds after every operation. Cascading clear (rather than rejecting the edit) matches how fans expect brackets to behave — change an upset and the downstream collapses.

**3. Completeness is computed, with a derived champion only when complete.**
`empty` (0 picks) / `partial` / `complete` (all 31 consistent). The champion is the Final's pick when complete. This avoids exposing a misleading "champion" from a partial bracket.

**4. Lock is a pure function of the snapshot.**
`isLocked(snapshot)` is true once the earliest knockout (`R32`) fixture has kicked off (status `live`/`complete`, or kickoff time reached relative to `snapshot.fetchedAt`). Edits are gated on this. Keeping lock snapshot-derived (not wall-clock) keeps the model pure and testable. The exact "kicked off" predicate reuses the data layer's fixture status; precise rule pinned in implementation.

**5. Identify matches by the bracket's stable `id` (e.g. "M73").**
Picks reference `BracketMatch.id`, which is stable across rebuilds, so a stored prediction stays meaningful as the snapshot updates.

## Risks / Trade-offs

- **Cascade clearing could surprise users (lose downstream picks on an early change)** → this is standard bracket behavior; the UI will surface it. The model just guarantees consistency.
- **Lock predicate ambiguity (what counts as "kicked off")** → reuse the existing `FixtureStatus`/kickoff handling from the data layer; cover with tests for before/at/after kickoff.
- **Bracket not yet fully resolved when a prediction is made** → predictions are meant to be filled once R32 participants are concrete; if a referenced slot is still a placeholder, picks on dependent matches are simply not allowed until participants resolve. Tested.

## Open Questions

- Whether to allow "auto-fill from the model/seed" as a starting point — deferred to the predictor UI / model-comparison change; the pure model only needs explicit picks.
