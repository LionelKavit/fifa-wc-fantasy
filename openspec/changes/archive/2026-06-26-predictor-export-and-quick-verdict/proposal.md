## Why

The export + chat experience doesn't yet feel like a mainstream bracket pool. The share image looks shabby and only opens in a tab; the CSV isn't in a familiar pool format; there's no PDF; and the Analyst doesn't advertise the fast "just give me a verdict" path fans love. This change makes exports look and download like real bracket pools (image / CSV / PDF) and adds a quick matchup-verdict prompt.

## What Changes

- **Redesigned share card (PNG download):** restyle the share image to a polished, champion-centric card in the WC 2026 theme — predicted **champion** front-and-centre with the **Final Four** and the key figures (projected score, still-alive, upsets) — inspired by mainstream bracket "champion share" cards. It SHALL be **downloadable as a `.png` file** (not just opened in a tab).
- **Mainstream CSV format:** export picks as a familiar pool-style sheet — columns `Round, Matchup, Pick` (readable team names, ordered R32→Final, champion row) — the layout pool trackers expect.
- **Printable PDF:** add a **PDF download** of the picks in a clean, mainstream printable-bracket style (round-by-round picks sheet), generated client-side.
- **Quick matchup verdict:** add an Analyst suggested prompt that teaches the shortcut — `just type "NED vs MAR"` — and make a bare `X vs Y` message return a brief one-line verdict of that matchup (who's favoured + the odds), via the existing head-to-head tool.

This is **UI + export + a small Scout prompt** change. No engine/probability changes; the figures come from the existing evaluation.

## Capabilities

### Modified Capabilities
- `predictor-share-card`: champion-centric, Final-Four card design; downloadable as PNG.
- `bracket-predictor-ui`: export offers CSV (mainstream `Round, Matchup, Pick` format), PNG (download), and PDF (printable picks sheet).
- `scout-chat-ui`: a quick matchup-verdict suggested prompt (`type "NED vs MAR"`).
- `scout-conversation`: a bare `X vs Y` message returns a brief one-line matchup verdict.

## Impact

- **Card** (`app/api/share/route.tsx`): redesigned ImageResponse (still a PNG); the predictor's "Image card" action downloads it as a file (client blob fetch).
- **Exports** (`app/components/BracketPredictor.tsx`): CSV reformatted; new PDF via the added `jspdf` dependency (client-side); PNG download.
- **Scout** (`lib/scout/prompt.ts`): one line so a bare `X vs Y` → a brief verdict using `compare_teams`. `AppShell` adds the suggested prompt.
- **New dependency:** `jspdf` (client-side PDF). No engine/API/data changes; same figures.
- **Depends on** `predictor-share-card` + `unified-tabbed-app` (+ ui-1) — archive those first.
