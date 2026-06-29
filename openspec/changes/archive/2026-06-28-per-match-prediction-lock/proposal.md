## Why

The predictor locks the **entire** bracket the moment the first knockout match kicks off (`isPredictionLocked` returns true if *any* knockout fixture is live/complete/past-kickoff). So when CAN–RSA started, all 31 other matches froze and the Analyst/autofill went read-only — even though nothing else has been decided. That's far too blunt: we're an advisor, not a pool host, and the knockout bracket fills progressively, so users should keep predicting every round that hasn't happened yet.

The right model is **per-match, keyed on the result being in**: a match is editable until *its own* fixture is **complete** — including while it is **live/in-progress** — and once it's decided, the **real winner** becomes the locked default pick. A decided match stays decided; everything else stays predictable.

## What Changes

- **Locking becomes per-match.** A knockout match is editable while its fixture is `scheduled` or `live`; it locks only once it is `complete` (with a derivable winner). Deciding one match never locks the others.
- **A decided match defaults to the real winner.** Once a match completes, its pick is set to the actual winner from our data and locked (overriding any earlier prediction); that real winner advances as the participant of the next match, so downstream reflects reality.
- **Edits & autofill work on every not-yet-decided match** (live included). Autofill completes the not-decided matches, treating decided results as fixed (reusing the `locked` completion from `complete-bracket-autofill`). Clear resets only the not-decided picks.
- **Remove the global lock + "🔒 the knockouts have started" banner.** Decided matches simply render read-only with their real winner.
- **Edge:** if a completed fixture has no derivable winner (e.g. decided on penalties not encoded in the score), the match is treated as not-yet-decided (`bracket.ts`'s `winnerOf` already returns null there) and stays editable.

## Capabilities

### Modified Capabilities
- `bracket-prediction`: replace the global "locked at first knockout kickoff" rule with **per-match locking on decided results** — editable until a match is complete (live included); a decided match locks to its real winner and that winner advances downstream.
- `bracket-predictor-ui`: edit any not-yet-decided match (live included); only decided matches are read-only (showing the real winner); no global read-only/banner; autofill and Clear stay available and operate on the not-decided matches.

## Impact

- **Engine** (`lib/engine/prediction.ts`): the bracket already exposes each decided knockout match's real winner (`match.winner`, from `winnerOf` in `bracket.ts`). Replace `isPredictionLocked(snapshot): boolean` with per-match helpers — a decided-winners map (`matchId → real winner`) and an `isMatchDecided`/effective-prediction overlay that forces decided winners (and cascade-clears any prediction they contradict). `pick()` rejects edits only to decided matches.
- **Server** (`lib/server/predictor.ts`): stop sending a single `locked` boolean; expose the decided-winners (per-match locked) info so the UI can lock per match; fold decided winners into the autofill `locked` set with priority over user picks.
- **UI** (`app/components/BracketPredictor.tsx`): disable only decided matches (show the real winner), drop the global banner/read-only; keep the Build box (autofill/Clear) active; autofill sends the effective picks (decided ∪ user, decided priority); Clear clears only not-decided picks.
- **Depends on** [[complete-bracket-autofill]] (autofill's `locked`-completion is reused for "treat decided results as fixed"); archive that change first. No probability-model or scoring change.
