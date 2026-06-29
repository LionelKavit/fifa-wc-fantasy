## Why

The unified app works, but the first UI pass is hard to read (dark-on-dark, low contrast), the future-round bracket is visually noisy (verbose "Winner of M.." labels everywhere), and the stats panel doesn't *read* as a bracket pool — a newcomer doesn't immediately recognize it as "your standings." This change is a focused visual polish: improve legibility, blank the not-yet-determined slots, and restyle the scorecard to look like a familiar online bracket-pool leaderboard — all grounded in the FIFA World Cup 2026 brand.

## What Changes

- **Legibility:** raise text/element contrast and spacing so the app is easy on the eyes — readable labels, clear hierarchy, and dimming reserved for genuinely inactive elements (not active content).
- **Blank future-round slots:** undetermined later-round matchups render as **empty/quiet slots**, not verbose "Winner of M74 (GER v PAR)" labels. Slots fill in only as picks (or results) determine them.
- **Leaderboard-style scorecard:** restyle the predictor's stats panel so it immediately reads as a bracket-pool **standings/scorecard** — a prominent hero figure (projected score) with rank-style framing, scannable labelled rows, and clear "your score / still alive / boldness" hierarchy.
- **WC 2026 theme:** ground the palette and accents in the official 2026 brand — a restrained black/white base with **gold** as the primary accent and a **green** counter-accent (the trophy's gold + malachite) — applied consistently across the shell, tabs, scorecard, and chat. Original styling only; no FIFA logos/imagery.

This is **UI/styling only** — no engine, API, data, or behaviour changes; the same numbers and flows, presented better.

## Capabilities

### Modified Capabilities
- `bracket-predictor-ui`: blank/minimal future-round slots; the score panel restyled as a leaderboard-style scorecard; higher-contrast, legible treatment.
- `app-shell`: a readable WC 2026 visual theme (palette/contrast) applied consistently across tabs and the chat.

## Impact

- **UI only** (`app/components/*`, `app/globals.css`): `BracketPredictor` (slot rendering + the `Headline`/scorecard), `AppShell` (theme/contrast), and shared tokens. No changes to `lib/`, the APIs, or the share-card figures.
- **Depends on** `unified-tabbed-app` (the shell + predictor it restyles) — archive that first.
- **Accessibility:** aim for comfortable contrast on text and interactive elements (legible on the dark theme).
- **No** new dependencies; Tailwind + existing component conventions.
