## Why

Autofill today **clobbers**: "Build/Rebuild" generates a full bracket from scratch and (per `declutter-bracket-panel`) confirms before overwriting. But the natural workflow is collaborative — a user fills a few picks they feel strongly about, or tweaks the autofill's picks, and then wants the Analyst to **complete the rest around what they've already chosen**. Clobbering throws their work away.

This makes the primary action a **completion**: keep every pick already in the bracket and fill only the empty matches. "Empty bracket → full autofill" becomes just the special case where every match is a gap. A partial bracket is always path-consistent (the UI only lets you pick among a match's resolved participants), so completion is pure forward gap-filling — no back-propagation, and existing picks are honored as fixed. Tweaks fall out for free: editing a pick clears the now-infeasible downstream (existing bracket rules), and completing refills exactly those, consistent with the tweak, leaving untouched branches alone.

## What Changes

- **Generator** completes from existing picks: a new optional `locked` set of current picks is kept as-is (when valid), and only the unset matches are decided. Empty `locked` reproduces today's from-scratch bracket. Output stays complete, feasible, deterministic.
- **Boldness budget counts existing upsets:** the risk/pool boldness target is measured over the whole bracket; the generator subtracts the upsets already present in the user's picks and spends only the remaining budget on the unset matches — so the completed bracket honors the chosen risk level, and it never removes or overrides an existing pick to do so.
- **Generate endpoint** accepts the user's current picks and completes from them (absent/empty → full generation).
- **UI (the settings box):** the primary action becomes **Complete** — it fills gaps and keeps existing picks, so it **no longer asks for overwrite confirmation**. Label reflects state: "Build my bracket for me" (empty), a "finish" label (partial), disabled when already complete (no gaps). **Clear bracket** resets to zero picks; a fresh full bracket = Clear, then Build. There is no separate regenerate-everything control that overrides picks.
- **Scope:** Mode A only (keep all current picks, fill gaps). Provenance-based "keep only my tweaks, re-roll the rest" is explicitly out of scope.

## Capabilities

### Modified Capabilities
- `bracket-generator`: accepts existing picks and completes from them (keeping valid picks, filling gaps); the boldness budget counts already-present upsets; the generate endpoint accepts the current picks.
- `bracket-verdict-card`: the primary action completes the bracket from its current state (keeps picks, fills gaps, no overwrite confirmation); Clear resets to zero; the action is disabled when the bracket is already complete.

## Impact

- **Engine** (`lib/engine/bracketGenerator.ts`): `generateBracket` gains a `locked?: Prediction` option; a top-down pass keeps valid locked picks and decides the rest; `boldnessBudget` is reduced by the count of locked upsets (floored at 0). Pure/deterministic.
- **Server** (`lib/server/predictor.ts`): `generatePrediction` accepts the current picks and passes them as `locked`. (The leverage path is unaffected/unexposed; it could adopt the same `locked` idea later — out of scope.)
- **API** (`app/api/predictor/generate/route.ts`): accept an optional `picks` array (validated leniently); pass through.
- **UI** (`app/components/BracketVerdict.tsx`): the build action sends the current picks, drops the overwrite confirmation, and uses state-aware labels (empty / partial / complete-disabled). Clear is unchanged.
- **Depends on** [[declutter-bracket-panel]] (it owns the `bracket-verdict-card` "Generate, populate, then tweak" / rebuild requirements this change modifies) and stacks after it — archive `declutter-bracket-panel` (and `simplify-predictor-display`) before this one.
- **No probability-model or scoring change.**
