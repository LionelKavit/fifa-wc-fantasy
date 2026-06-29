## Why

The post-bracket panel currently flips to a **verdict card** once the bracket is complete — win %, You-vs-the-model, a likely-points range, and an Analyst sentence. In practice these numbers raise more questions than they answer for a casual fan ("why 12%? is that good? what do I do with it?") and pull focus from the one thing the user actually came to do: fill a bracket and take it to their pool. The Scout chat already exists for any "is this good?" follow-up.

This change strips the panel down to a **builder**: a single, persistent "Your bracket settings" box (pool size + risk + autofill) and the Lock & Export box. No percentages, no verdict — the user fills (or autofills) the bracket, tweaks picks, and exports. Pool size stays as an input because it still tunes how bold the autofilled bracket is, but it no longer drives any displayed number.

## What Changes

- **Rename** the panel heading "YOUR VERDICT" → **"Your bracket settings"**.
- **Copy** update: "Don't want to fill all 31? / Let the Analyst build a bracket for your pool — then tweak any pick." → **"Need help filling your bracket? / Autofill with the Analyst – then tweak any pick."**
- **Pool size moves inside** the box with a prompt to **enter an approximate pool size**, and the **default is 20** (was 10). It is a generation setting only (tunes boldness); it no longer drives a verdict.
- **Risk**: remove the pool-size-based recommendation text ("Balanced · recommended", "Recommended: …"); add a plain **"Choose risk level"** label above the slider.
- **Remove the "Optimize for win %" toggle.** Autofill uses the default heuristic generator. (The leverage strategy stays available server-side, just not exposed here.)
- **Remove the entire verdict view** shown when the bracket is complete: the win-% hero, You-vs-the-model, the likely-points range, and the Analyst note. **No percentages or verdict are shown at any point.**
- **Persist the slim settings box** even when the bracket is complete: pool size + risk slider + a **Build/Rebuild** action + **Clear bracket**. Rebuild re-runs the generator at the current settings (a fresh seed gives variety); the discrete Regenerate / Bolder / Safer buttons are folded into the slider + Build. The filled bracket and Lock & Export remain.
- **Endpoints unchanged:** the pool-finish and verdict-note server endpoints stay (they remain valid server capabilities); the UI simply stops calling them. They become candidates for a future cleanup, out of scope here.

## Capabilities

### Modified Capabilities
- `bracket-verdict-card`: the panel becomes a persistent bracket-settings/builder box. The completeness-based swap to a verdict, the win-%/You-vs-model/points-range display, the in-card Analyst note, and the "Optimize for win %" toggle are removed; pool size moves inside the box (default 20) as a boldness-tuning generation input; rebuild happens in-place via the slider + Build.

## Impact

- **UI** (`app/components/BracketVerdict.tsx`): the main change — drop the verdict rendering and its data fetching (pool-finish verdict + verdict-note), drop the Optimize checkbox and the Regenerate/Bolder/Safer buttons, make the settings box persistent (show when complete too), relocate the pool-size input inside the box with the new prompt + default 20, update heading/copy, add the "Choose risk level" label, and label the action Build/Rebuild. Keep Clear bracket and the picks counter.
- **No server/engine changes.** The `/api/predictor/pool-finish` and `/api/predictor/verdict-note` endpoints remain (now unused by this panel); generation still calls `/api/predictor/generate` with the heuristic strategy.
- **No probability-model or scoring change.**
