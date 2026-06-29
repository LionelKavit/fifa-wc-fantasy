## Why

Three small declutters to keep the predictor focused on the one job — fill a bracket, take it to your pool:

- The per-pick **expected-points** figure on each match card ("39% · 0.5 pts") is internal-scoring noise the user doesn't act on. The win/upset percentage is enough.
- "**upset watch**" reads like jargon; "**chance of upset**" says the same thing plainly.
- **PNG and PDF** exports add little over the CSV (which is what pool trackers actually ingest) and carry a dependency (jspdf) and a server image path for marginal value.
- The group stage is decided, so the verbose per-group narration ("… have secured a top-2 spot; … is still fighting to advance; … is out") is stale clutter. A one-liner naming who advanced is all that's useful now.

## What Changes

- **Match cards:** drop the per-pick **expected-points** ("· X.X pts") from each match box; keep the win/model percentage and the bold-underdog 💥 marker.
- **Upset flag copy:** "💥 upset watch" → "💥 chance of upset".
- **Export:** remove the **PNG** and **PDF** export buttons and their handlers (and the jspdf import); keep **CSV** as the only export.
- **Group cards:** replace the verbose grounded narration line with a brief summary naming the teams that have **advanced** (derived from each team's next-round probability) — no "still fighting" or "is out" clauses. This is a UI-only derivation; the grounded `narrateGroup` used by the Scout is unchanged.
- **Branding/header:** the app headline becomes "FIFA World Cup 2026 Bracket **Analyst**" (was "Bracket Agent"), and the subtitle becomes "Fill your knockout bracket and get grounded strategy from the Analyst." (dropping the "track it as the tournament unfolds" clause). Applied across the header, the page/tab title, and the share card for consistency.

## Capabilities

### Modified Capabilities
- `bracket-predictor-ui`: match cards no longer show a per-pick expected-points figure; the inline upset flag reads "chance of upset"; export offers CSV only (PNG/PDF removed).
- `group-dashboard`: each group card shows a concise "who advanced" summary instead of the full contention/elimination narration.
- `app-shell`: the headline is rebranded "FIFA World Cup 2026 Bracket Analyst" (was "Bracket Agent").

## Impact

- **UI** (`app/components/BracketPredictor.tsx`): remove the `· X.X pts` from the match-card secondary text; change the upset-flag label; remove the PNG/PDF export buttons, the `downloadPng`/`downloadPdf` handlers, the lazy `jspdf` import, and the now-unused `shareUrl` (and `encodePrediction` import if it becomes unused); the export grid becomes CSV-only.
- **UI** (`app/components/GroupCard.tsx`): derive and render a concise advanced-teams line from `group.teams` (next-round probability) instead of `group.narration`.
- **Branding** (`app/components/AppShell.tsx`, `app/layout.tsx` metadata, `app/api/share/route.tsx`): "Bracket Agent" → "Bracket Analyst" and the new subtitle.
- **No engine/server changes.** `narrateGroup` (Scout grounding) is untouched. The `/api/share` PNG endpoint and the `predictor-share-card` capability remain server-side but are no longer linked from the predictor (a future-cleanup candidate, out of scope here).
- **No probability-model or scoring change.**
