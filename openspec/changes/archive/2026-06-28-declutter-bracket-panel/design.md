## Context

`app/components/BracketVerdict.tsx` renders the post-bracket panel. Today it does two things based on completeness: while incomplete it shows the **Build box** (pool-size input in the header, risk slider with a pool-size recommendation, "Optimize for win %" toggle, "Build my bracket for me"); once complete it swaps to the **verdict card** (win-% hero, You-vs-the-model, likely-points range, Analyst note fetched from `/api/predictor/verdict-note`, and Regenerate/Bolder/Safer rebuild controls). The verdict numbers come from `/api/predictor/pool-finish`. A separate Lock & Export box sits below.

This change removes the verdict half entirely and keeps a single persistent settings box.

## Goals / Non-Goals

**Goals:**
- One persistent "Your bracket settings" box: pool size (inside, default 20), risk slider, Build/Rebuild, Clear. Visible whether the bracket is empty, partial, or complete.
- No percentages or verdict anywhere in the panel.
- Keep autofill → editable bracket → export working; keep Clear and the picks counter.

**Non-Goals:**
- Removing the pool-finish / verdict-note server endpoints (kept; just unused by the UI).
- Changing the generator, the probability model, scoring, or the Scout.
- Re-exposing the leverage ("Optimize") strategy in the UI.

## Decisions

**1. Persistent settings box, no completeness swap.** Drop the "incomplete → Build box / complete → verdict" branch. The box always renders the same controls. The only completeness-dependent bits are cosmetic: the picks counter ("12/31 picks made…") and the primary action label ("Build my bracket for me" when empty → "Rebuild my bracket" when it already has picks). Lock & Export stays below and remains gated on completeness as today.

**2. Pool size inside the box.** Move the pool-size number input out of the header into the box body, under a prompt like "Enter an approximate pool size" (helper text clarifying it tunes how bold the autofill is). Default state value becomes **20**. It feeds only the generate request; no verdict re-evaluation is wired anymore.

**3. Risk control.** Remove the recommendation derivation and its text entirely. Add a static "Choose risk level" label above the slider. The slider keeps Safe ↔ Balanced ↔ Bold and may still show the selected level name (without "recommended").

**4. Rebuild via slider + Build.** Remove the discrete Regenerate / Bolder / Safer buttons. Re-rolling is: adjust the slider (and/or pool size) and press Build/Rebuild. Each Build uses a fresh seed so repeated presses give variety (preserving the old Regenerate behavior); overwrite confirmation when picks already exist stays.

**5. Remove verdict rendering + its data path.** Delete the win-% hero, You-vs-the-model, likely-points range, and the Analyst-note block, plus the effects/state that fetch `/api/predictor/pool-finish` and `/api/predictor/verdict-note`. No loading/error UI for verdict numbers remains (there are none). Generation keeps its own loading/error state.

**6. Endpoints retained.** `/api/predictor/pool-finish` and `/api/predictor/verdict-note` (and their server logic/tests) stay in place — valid server capabilities, simply not called by this panel. Flagged as a future cleanup, not done here, to keep the change UI-only.

## Risks / Trade-offs

- **Loss of decision signal.** Users no longer see win-% / boldness feedback. Accepted per product intent: the numbers confused more than helped; the Scout chat covers "is this good?". 
- **Pool size with no visible effect.** It now only influences autofill boldness, which isn't directly shown. Mitigated by helper copy ("approximate pool size — tunes how bold the autofill is"). If it proves confusing, a later change could drop it, but it remains a meaningful generation input today.
- **Dead endpoints.** Keeping unused endpoints is mild debt; called out explicitly for a follow-up rather than expanding this change's blast radius.
- **No automated UI test.** The component is exercised by hand in the browser; verification is via the preview (the affected server endpoints are untouched, so route tests are unaffected).
