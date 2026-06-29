## Context

`isPredictionLocked(snapshot)` (`lib/engine/prediction.ts`) returns a single global boolean — true if *any* knockout fixture is live/complete/past-kickoff — and `pick()` rejects all edits when it's true. The server sends `locked: isPredictionLocked(snapshot)`; `BracketPredictor` disables the whole tree and shows a "🔒 the knockouts have started" banner.

Crucially, the bracket already knows each decided knockout match's **real winner**: `buildBracket` (`lib/engine/bracket.ts`) sets a match's `winner` ref from the completed fixture via `winnerOf` (which returns null when the result isn't derivable from the recorded score, e.g. penalties). So "is this match decided, and who won" is already available per match — we just don't use it for locking.

## Goals / Non-Goals

**Goals:**
- Per-match editability: editable while `scheduled` or `live`; locked only when `complete` (winner derivable).
- A decided match's pick defaults to the real winner, locked, and advances downstream.
- Autofill/edit/Clear operate on the not-decided matches; decided results are fixed.
- Remove the global lock + banner.

**Non-Goals:**
- Scoring/verdict UI (already removed) — this is about editability + reflecting reality, not points.
- Changing how `winnerOf` derives winners (penalty-decided matches stay "not derivable" → treated as not-decided).
- The leverage path / probability model.

## Decisions

**1. "Decided" = the match has a real winner.** Reuse `match.winner` from `buildBracket`. Add an engine helper `decidedWinners(bracket): Map<matchId, teamId>` over matches whose `winner` is set, and `isMatchDecided(bracket, matchId)`. A live match's fixture is not `complete`, so it has no `winner` → not decided → editable (satisfies "predict during a live match").

**2. Effective prediction overlays decided winners.** The user's picks are overlaid with decided winners (decided wins), then downstream picks contradicted by a decided result are cascade-cleared (existing `cascadeClear`). This effective prediction is what the bracket renders and what feeds participant resolution, so decided winners advance downstream regardless of any earlier prediction. Expose this as a pure helper (e.g. `withDecided(bracket, prediction)`).

**3. `pick()` rejects only decided matches.** Replace the global `isPredictionLocked` guard in `pick()` (and clear) with `isMatchDecided(bracket, matchId)`. Editing a not-decided match is always allowed (live or scheduled).

**4. Autofill treats decided results as fixed.** The server builds the autofill `locked` set as **decided winners ∪ user picks**, decided taking priority, and passes it to `generateBracket` (the `locked` completion from `complete-bracket-autofill`). So autofill never contradicts a real result and only fills the genuinely open matches. Clear removes only not-decided picks (decided winners persist as the effective bracket).

**5. Server stops sending a global `locked`.** Instead it sends the per-match decided info (e.g. the decided-winners map, or a per-match `locked`/`winner` on the serialized matches) so the UI can disable per match and seed the real winners. The global banner is removed.

**6. UI.** `BracketPredictor` overlays decided winners onto its picks, disables only decided match cards (rendered read-only with the real winner), removes the global banner/read-only, keeps the Build box active, sends the effective picks to autofill, and Clears only not-decided picks.

## Risks / Trade-offs

- **Penalty-decided matches.** `winnerOf` can't derive a winner from a pens result not encoded in the score → such a completed match reads as not-decided and stays editable until the data encodes the winner. Pre-existing limitation; documented, not fixed here.
- **Decided overrides a user's prediction.** When a match completes, its pick snaps to the real winner (and downstream contradictions clear). This is intended ("the model considers the result the default pick"); the user's earlier wrong pick is not preserved (we no longer show pick-scoring, so there's nothing to preserve).
- **Data plumbing.** Replacing the global boolean with per-match info touches the predictor data shape and the UI; kept behavioral in the spec, detailed in tasks.
- **Stacks on `complete-bracket-autofill`.** Reuses its `locked` completion, so archive that first.
