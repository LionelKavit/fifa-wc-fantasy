## 1. Generator — complete from existing picks

- [x] 1.1 Add `locked?: Prediction` to `GenerateBracketOptions` in `lib/engine/bracketGenerator.ts`.
- [x] 1.2 In the top-down pass, at each match: if `locked` has a pick and that team is a valid resolved participant, set it and mark the match locked (ineligible for the budget); otherwise take chalk and register a budget candidate as today. An invalid/stale locked pick is ignored (decided normally).
- [x] 1.3 Reduce the budget by locked upsets: `remaining = max(0, boldnessBudget(risk, poolSize) − lockedUpsetCount)`; spend `remaining` on the open candidates via the existing value ranking (favor/fade + jitter unchanged). Never remove/override a locked pick.
- [x] 1.4 Ensure empty `locked` reproduces the exact from-scratch output (no behavior change when absent).

## 2. Server + API

- [x] 2.1 In `lib/server/predictor.ts`, have `generatePrediction` accept the user's current picks and pass `locked: new Map(picks)` to `generateBracket` (heuristic path). Empty/absent → full generation.
- [x] 2.2 In `app/api/predictor/generate/route.ts`, accept an optional `picks: [matchId, teamId][]` (validate leniently like the pool-finish route — array of `[string, number]`; ignore/400 on malformed) and pass it through.

## 3. UI — complete, don't clobber

- [x] 3.1 In `app/components/BracketVerdict.tsx`, send the current picks with the generate request.
- [x] 3.2 Remove the overwrite `confirm()`; the action only fills gaps. State-aware label: empty → "🪄 Build my bracket for me"; partial → a finish/complete label (e.g. "🪄 Finish my bracket"); complete → disabled. Keep Clear bracket (reset to zero) and the loading/error state.

## 4. Tests

- [x] 4.1 Engine: completing a partial bracket keeps the existing picks and fills the rest (complete + feasible); an empty `locked` yields the identical bracket to from-scratch for the same inputs/seed; an invalid locked pick is ignored (bracket stays feasible).
- [x] 4.2 Engine: budget counts locked upsets — completing a bracket that already has N upsets adds at most `budget − N` further upsets in the gaps and never changes a locked pick; determinism with a fixed seed + locked set.
- [x] 4.3 Route: `POST /api/predictor/generate` with `picks` returns a complete bracket that contains those picks; without `picks` returns a full from-scratch bracket; malformed `picks` is handled (ignored or 400) without 500.

## 5. Verify

- [x] 5.1 Verified empty-state label "🪄 Build my bracket for me" (0/31) and complete-state "✓ Bracket complete" (disabled). NOTE: the live dev data is now past kickoff, so the predictor is in the tournament read-only lock (all R32 buttons disabled) — the editable partial flow (keep picks, no overwrite prompt, refill after a tweak) could not be clicked through in-browser in this data state. That behavior is covered end-to-end by the engine tests (keeps picks / empty==scratch / invalid ignored / budget counts locked) and the route test (POST /generate with picks completes and keeps them; malformed ignored).

## 6. Spec sync

- [x] 6.1 Confirm the implementation matches the ADDED/MODIFIED requirements in `specs/bracket-generator/spec.md` and the MODIFIED requirements in `specs/bracket-verdict-card/spec.md`; keep code and specs in sync. (Archive after `declutter-bracket-panel`.)
