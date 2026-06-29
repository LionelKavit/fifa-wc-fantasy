## 1. Panel chrome + copy

- [x] 1.1 In `app/components/BracketVerdict.tsx`, rename the panel heading "YOUR VERDICT" → "Your bracket settings".
- [x] 1.2 Update the intro copy to "Need help filling your bracket?" / "Autofill with the Analyst – then tweak any pick."

## 2. Settings controls

- [x] 2.1 Move the pool-size input from the header into the box body, with a prompt to enter an **approximate** pool size (helper text: it tunes how bold the autofill is). Change the default state value to **20**.
- [x] 2.2 Remove the pool-size-based risk recommendation (the "Balanced · recommended" line and the "Recommended: …" sentence). Add a plain "Choose risk level" label above the slider; keep Safe/Balanced/Bold (current selection may still be shown, without "recommended").
- [x] 2.3 Remove the "Optimize for win %" checkbox and its state; autofill always uses the default heuristic strategy.

## 3. Persistent box + rebuild

- [x] 3.1 Make the settings box render regardless of completeness (drop the incomplete→Build / complete→verdict branch). Keep the picks counter and Clear bracket. Label the primary action "Build my bracket for me" when empty and as a rebuild once picks exist.
- [x] 3.2 Replace the Regenerate / Bolder / Safer buttons with the slider + build action: each build re-runs at the current risk/pool with a fresh seed; keep the overwrite confirmation when picks already exist; keep the build loading/error state.

## 4. Remove the verdict

- [x] 4.1 Delete the verdict rendering: the win-% hero, You-vs-the-model, the likely-points range, and the Analyst-note block.
- [x] 4.2 Remove the data path that fed it: the fetch/effects/state for `/api/predictor/pool-finish` (verdict numbers) and `/api/predictor/verdict-note` (Analyst sentence), plus any now-unused imports/helpers in the component. Leave the server endpoints themselves in place.

## 5. Verify

- [x] 5.1 Verify in preview: empty state shows "Your bracket settings" with the new copy, pool size inside (default 20) with the approximate prompt, "Choose risk level" + slider (no recommendation), no Optimize toggle, and "Build my bracket for me". Autofill fills an editable bracket. When complete, the panel still shows the slim settings box (pool size + slider + Rebuild + Clear) and Lock & Export — and NO win %, finish, points range, You-vs-model, or Analyst note. Rebuild re-rolls; Clear works. No console/network errors (no calls to pool-finish or verdict-note).

## 6. Spec sync

- [x] 6.1 Confirm the implementation matches the ADDED/MODIFIED/REMOVED requirements in `specs/bracket-verdict-card/spec.md`; keep code and specs in sync.
