## 1. Engine — per-match decided state

- [x] 1.1 In `lib/engine/prediction.ts`, add `decidedWinners(bracket): Map<string, number>` (matchId → real winner) from each match's `winner` ref (set by `buildBracket`/`winnerOf`), and `isMatchDecided(bracket, matchId): boolean`.
- [x] 1.2 Add a pure `withDecided(bracket, prediction): Prediction` that overlays decided winners (decided priority) onto a prediction and cascade-clears any downstream pick they contradict (reuse `cascadeClear`).
- [x] 1.3 Change `pick()` (and clear) to reject edits only when the **target match** is decided (`isMatchDecided`), not via the old global lock. Remove/retire `isPredictionLocked` (or keep as a thin deprecated helper if still imported elsewhere — prefer removing usages).

## 2. Server

- [x] 2.1 Per-match decided info was ALREADY exposed: the serialized `UIMatch` carries `winner` (the real result), so the UI locks per match from that. DEVIATION: the global `data.locked` boolean is left in the payload but the UI no longer reads it (removing it would touch `BracketData`/`predictor.test` for no behavioral gain) — no server change was needed.
- [x] 2.2 Achieved without a server merge: the UI sends its **effective** picks (decided winners overlaid onto user picks, decided priority — via `withDecided`/`overlay`) to `generatePrediction`, which passes them as the `locked` set to `generateBracket` (the `complete-bracket-autofill` completion). So autofill keeps decided results and fills only the open matches. (The only caller is the UI, which always sends effective picks.)

## 3. UI

- [x] 3.1 In `app/components/BracketPredictor.tsx`, overlay decided winners onto the picks (via `withDecided`); render decided match cards read-only showing the real winner; remove the global read-only state and the "🔒 the knockouts have started" banner.
- [x] 3.2 Disable only decided match-card team buttons; keep all not-decided matches (incl. live) interactive.
- [x] 3.3 Keep the Build box active: autofill sends the effective picks (decided ∪ user) so the server completes the not-decided matches; Clear removes only the not-decided picks (decided winners persist). Update the `BracketVerdict` `locked`/disabled wiring accordingly (it should no longer be globally disabled).

## 4. Tests

- [x] 4.1 Engine: `pick()` accepts an edit to a scheduled or **live** match and rejects an edit to a **complete** match; `decidedWinners` lists only complete matches with a derivable winner; a penalty-only/underivable completed fixture is not treated as decided.
- [x] 4.2 Engine: `withDecided` forces the real winner into the prediction (overriding a contrary pick), advances it downstream, and cascade-clears the now-invalid later picks.
- [x] 4.3 Engine/route: autofill completes from `decided ∪ user picks` — the result contains every decided winner and every not-decided user pick, fills the rest, and is complete + feasible.

## 5. Verify

- [x] 5.1 Verify in preview against the current data (CAN–RSA live): the bracket is NOT globally locked — R32/R16/… buttons for not-decided matches are interactive, autofill and Clear work, and the live CAN–RSA match is still pickable. Any `complete` match shows its real winner read-only. (If no match is complete yet in the data, confirm nothing is locked and everything is editable.) No console/server errors.

## 6. Spec sync

- [x] 6.1 Confirm the implementation matches the ADDED/REMOVED requirements in `specs/bracket-prediction/spec.md` and the MODIFIED requirement in `specs/bracket-predictor-ui/spec.md`; keep code and specs in sync. (Archive after `complete-bracket-autofill`.)
