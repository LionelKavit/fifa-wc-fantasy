## 1. Card redesign + PNG download

- [x] 1.1 Enrich `cardSummary` (`lib/server/predictor.ts`) to also return the runner-up and the four semifinalists (from the Final + Semifinal picks).
- [x] 1.2 Redesign `app/api/share/route.tsx` (ImageResponse/PNG): champion-centric hero + flag, a Final Four row, and a projected/still-alive/upsets stat strip; gold/green WC 2026 theme, no FIFA imagery.
- [x] 1.3 In the predictor, make the "Image card" action download the PNG as `my-bracket.png` (client blob fetch), not just open a tab.

## 2. CSV mainstream format

- [x] 2.1 Reformat the CSV to `Round, Matchup, Pick` (readable team names; matchup from predicted participants; champion called out; ordered R32→Final).

## 3. PDF export

- [x] 3.1 Add a PDF download using `jspdf` (lazy-imported client-side): a printable picks sheet — title, round-by-round matchup → pick, champion highlighted — saved as `my-bracket.pdf`.
- [x] 3.2 Add the PDF button to the Lock & Export panel alongside CSV and Image card.

## 4. Quick matchup verdict

- [x] 4.1 Add a prompt line (`lib/scout/prompt.ts`): a bare `X vs Y` → one-line verdict (favoured team + head-to-head %) via `compare_teams`, no preamble.
- [x] 4.2 Add an Analyst suggestion on the Knockouts tab: `Just type "NED vs MAR"` that sends `NED vs MAR`.

## 5. Verification

- [x] 5.1 Verify in preview: image card downloads as a polished PNG (champion + Final Four); CSV is `Round, Matchup, Pick`; PDF downloads as a picks sheet; a `X vs Y` message returns a brief verdict (with an API key) / the suggestion is present.

## 6. Spec sync

- [x] 6.1 Confirm implementation matches every scenario in the four spec deltas; keep code and specs in sync.
