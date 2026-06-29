## Context

`app/components/BracketPredictor.tsx` renders the knockout match cards (`MatchCard`: a "💥 upset watch" label when `match.upset`, and a per-slot secondary text showing the win/model percentage and, for the picked slot, `· {expectedPoints} pts`) and the Lock & Export box (CSV / PNG / PDF buttons wired to `downloadCsv` / `downloadPng` / `downloadPdf`; PNG fetches `shareUrl` → `/api/share`, PDF builds a doc via a lazily-imported `jspdf`). `app/components/GroupCard.tsx` (a server component) renders each group's standings plus a `group.narration` one-liner produced by `narrateGroup` (`lib/grounding/narrate.ts`), which is also consumed by the Scout (`lib/grounding/situation.ts`).

## Goals / Non-Goals

**Goals:**
- Remove per-pick expected-points from match cards; reword the upset flag to "chance of upset".
- CSV-only export (drop PNG + PDF).
- Group cards show a concise "who advanced" line.

**Non-Goals:**
- Changing `narrateGroup` or any Scout grounding (the Scout still needs full contention/elimination narration, and `narrateGroup` must keep handling in-progress groups).
- Removing the `/api/share` endpoint or the `predictor-share-card` capability (left server-side; just unlinked).
- Any engine, scoring, or probability change.

## Decisions

**1. Match-card points.** In `MatchCard`, the secondary text becomes just the percentage (`pct(slot.winProb)` or `pct(info.modelProb)`); drop the `· {expectedPoints.toFixed(1)} pts` suffix in both branches. Keep the `pct` percentage and the 💥 bold-underdog marker (a specced upset marker). `PickInfo.expectedPoints` stays in the type (still computed; just not displayed).

**2. Upset flag copy.** "💥 upset watch" → "💥 chance of upset" (and update the `title` tooltip text to match).

**3. CSV-only export.** Remove the PNG and PDF entries from the export grid, delete `downloadPng` and `downloadPdf`, the `await import("jspdf")`, and `shareUrl` (only PNG used it); drop `encodePrediction` import if it becomes unused. The export box renders a single CSV button (grid collapses to one column).

**4. Concise group summary (UI-derived, Scout untouched).** In `GroupCard`, stop rendering `group.narration` and instead derive the line from `group.teams`: a team has **advanced** when it is effectively certain to — `advancement === "clinched"` or `advancementProbability >= 0.999` (this captures best-third qualifiers, e.g. a 3rd-placed team shown at 100% next-round). Render `Group {G}: {list} {have/has} advanced.` using team abbreviations; when no team has advanced yet, render a brief `Group {G}: still being decided.`. `narrateGroup` is left as-is so the Scout keeps its full, in-progress-aware narration.

## Risks / Trade-offs

- **"Advanced" threshold.** Using `clinched` OR `prob >= 0.999` is robust for a decided group and avoids listing contenders; the small risk is Monte-Carlo rounding, mitigated by the high threshold and the `clinched` status as a second signal. In an undecided group the line falls back to "still being decided".
- **Two sources of group truth.** The card now derives its own summary while the Scout uses `narrateGroup` — a deliberate split (concise UI vs. full grounding). They can read slightly differently; acceptable since they serve different surfaces.
- **Orphaned share/PNG path.** `/api/share` and `predictor-share-card` remain but are no longer reachable from the predictor — mild debt, flagged for a future cleanup rather than widening this change.
- **Dropped jspdf usage.** The dependency may remain in `package.json` but is no longer imported; leaving it installed is harmless and out of scope to prune here.
