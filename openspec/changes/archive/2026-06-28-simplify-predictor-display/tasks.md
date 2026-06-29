## 1. Match cards

- [x] 1.1 In `app/components/BracketPredictor.tsx` `MatchCard`, drop the `· {expectedPoints.toFixed(1)} pts` suffix from both branches of the per-pick secondary text; keep the percentage and the 💥 bold-underdog marker.
- [x] 1.2 Change the upset label "💥 upset watch" → "💥 chance of upset" (and update its `title` tooltip to match).

## 2. Export

- [x] 2.1 Remove the PNG and PDF export buttons from the Lock & Export grid; keep only CSV (collapse the grid to a single column).
- [x] 2.2 Delete `downloadPng`, `downloadPdf`, the lazy `await import("jspdf")`, and `shareUrl`; remove now-unused imports (e.g. `encodePrediction`) — let typecheck confirm none are left dangling.

## 3. Group summary

- [x] 3.1 In `app/components/GroupCard.tsx`, derive a concise advanced-teams line from `group.teams`: advanced = `advancement === "clinched"` or `advancementProbability >= 0.999`. Render `Group {G}: {abbrs joined} {have/has} advanced.`; when none, render `Group {G}: still being decided.`. Render this instead of `group.narration`.
- [x] 3.2 Leave `narrateGroup` (`lib/grounding/narrate.ts`) and the Scout grounding unchanged.

## 4. Branding

- [x] 4.0 Rebrand the headline to "FIFA World Cup 2026 Bracket Analyst" and the subtitle to "Fill your knockout bracket and get grounded strategy from the Analyst." in `app/components/AppShell.tsx`; mirror the name in `app/layout.tsx` metadata and `app/api/share/route.tsx`.

## 4. Verify

- [x] 4.1 Verify in preview (Knockouts): match boxes show only the percentage (no "· X pts"); the upset flag reads "💥 chance of upset". Lock & Export shows only CSV (no PNG/PDF) and CSV still downloads. (Group stage): each group card shows a brief "… have advanced." line with no "still fighting"/"is out"; an undecided group (if any) shows the fallback. No console/network errors.

## 5. Spec sync

- [x] 5.1 Confirm the implementation matches the MODIFIED/REMOVED requirements in `specs/bracket-predictor-ui/spec.md` and the ADDED requirement in `specs/group-dashboard/spec.md`; keep code and specs in sync.
