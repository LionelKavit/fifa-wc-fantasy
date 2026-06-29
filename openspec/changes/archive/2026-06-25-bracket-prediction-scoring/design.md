## Context

`bracket-prediction` gives a fan's picks (`matchId → teamId`) over the knockout tree. `knockout-bracket` gives the *actual* bracket from the snapshot: real winners (`BracketMatch.winner`) and, via resolved slots, who really reached each match. Scoring overlays the two: for each pick, did it come true, can it still, or is it dead? This is the second half of the predictor core; leaderboards and contrarian "vs. the model" scoring come later.

## Goals / Non-Goals

**Goals:**
- A pure `scorePrediction(prediction, snapshot)` returning per-pick status + totals.
- Correct distinction between `wrong` (lost a match it reached) and `busted` (never reached the match).
- Round-weighted points with configurable, strictly-increasing defaults.
- Current and maximum-achievable totals.

**Non-Goals:**
- Multi-fan leaderboards / ranking (later).
- Contrarian "you vs. the model" bonus scoring (Phase D).
- UI/API/storage.

## Decisions

**1. Score against the actual `knockout-bracket(snapshot)`, not raw fixtures.**
The real bracket already resolves winners and who reached each match (group/third/match-winner propagation). Reusing it means scoring doesn't re-derive eliminations. `wrong` vs `busted` then falls out of "was the picked team an actual participant of this match?".

**2. Classify each pick from two facts: the match's real outcome and whether the picked team really reached it.**
For a pick `(matchId, team)`:
- If `team` is not an actual participant of `matchId` (and that match's participants are settled, i.e. the feeding results are known) → `busted`.
- Else if the match has a real winner → `correct` if it equals `team`, else `wrong`.
- Else (match undecided, team still a live participant or could still reach it) → `pending`.
"Reached/can reach" is read from the actual bracket: a team that lost earlier is absent from later real matches, so any later pick on it is `busted`. Edge cases (a later match whose participants aren't settled yet but the picked team is already eliminated) resolve to `busted` because elimination is final.

**3. Weights as a configurable record keyed by `KnockoutStage`, strictly increasing by default.**
Default e.g. `{ R32: 1, R16: 2, QF: 4, SF: 8, F: 16 }` (doubling — standard bracket-pool shape). Only `correct` picks score. Exposed so a caller can substitute house rules; the spec only mandates the strict ordering.

**4. Maximum-achievable = current + sum of `pending` weights.**
`pending` picks are the only ones that can still become points; `wrong`/`busted` are dead. This gives a meaningful "what's left to play for" and converges to the final score as matches resolve. Computed in the same pass.

**5. Scoring does not require a locked prediction.**
Locking is the prediction model's concern; scoring works on whatever picks exist (typically a locked one). This keeps scoring orthogonal and testable on partial predictions too.

## Risks / Trade-offs

- **"Can still reach" subtlety** → a pick is `pending` only when the team is not yet eliminated; once eliminated it is `busted` even before the match is played. Reading eliminations from the actual bracket (single source) avoids inconsistent logic. Covered by tests.
- **Penalty-decided real matches with level recorded scores** → the actual bracket leaves `winner` null when the score is level (winner not encoded); such a match scores as `pending` until a decisive winner is known. Documented; same limitation as `knockout-bracket`.
- **Weight tuning** → defaults are a starting point; configurability avoids bikeshedding in the spec.

## Open Questions

- Whether to also surface a per-round score breakdown (not just a grand total) — easy to add; deferred until the predictor UI says what it needs.
