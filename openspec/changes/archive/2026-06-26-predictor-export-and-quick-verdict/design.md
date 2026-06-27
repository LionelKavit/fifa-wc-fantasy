## Context

The predictor already evaluates a prediction (champion, projected score, survival, boldness) and has a share-card route, a CSV download, and an Analyst chat. This change polishes exports to mainstream bracket-pool norms and adds a quick matchup verdict. Informed by ESPN's champion-share card (champion + Final Four, celebratory) and common pool exports (round/matchup/pick sheets; printable PDFs).

## Decisions

**1. Card: champion-centric + Final Four, downloaded as PNG.**
Restyle `app/api/share/route.tsx` (still `ImageResponse` → PNG): big champion with flag, a row of the four semifinalists, and a compact stat strip (projected / still-alive / upsets), gold-on-dark WC 2026 theme. Enrich `cardSummary` to also return the runner-up and the four semifinalists (derive from the Final and Semifinal picks). Download: the predictor's "Image card" action fetches the PNG as a blob and saves `my-bracket.png` (instead of opening a tab).

**2. CSV: `Round, Matchup, Pick`.**
Replace the internal `Round, Match(id), Pick` with a readable pool format: each row is the round name, the matchup (`TeamA vs TeamB` from the predicted participants, or a single side when the other is undetermined), and the picked team; champion called out. Ordered R32→Final. Still client-side Blob download.

**3. PDF: client-side picks sheet via `jspdf`.**
Add `jspdf` (client). Generate a clean printable sheet: title ("My World Cup 2026 Bracket"), then each round as a section listing matchup → pick, and the champion highlighted. This matches the "printable picks" style pools offer without hand-drawing a bracket tree (deferred as a nicety). Download `my-bracket.pdf`.

**4. Quick verdict: prompt shortcut + suggestion.**
Add one prompt line: a bare `X vs Y` means "give a one-line verdict of that matchup" → the model calls `compare_teams(X, Y)` and replies with the favoured side + head-to-head %. Add an Analyst suggestion `Just type "NED vs MAR"` (Knockouts tab) that sends `NED vs MAR`. `compare_teams` already returns the head-to-head; only the prompt + suggestion are new. (Without an API key, the deterministic fallback can't give the verdict — same caveat as other LLM features.)

## Risks / Trade-offs

- **`jspdf` dependency / bundle size** → client-only, lazy-import in the download handler so it doesn't bloat the initial bundle; acceptable for the PDF feature.
- **PDF is a picks sheet, not a drawn bracket tree** → mainstream pools offer both; the sheet is the pragmatic, readable v1. A drawn tree can come later.
- **Card crowding with Final Four + stats** → keep the champion dominant and the Final Four a small row; verify it reads at 1200×630.
- **Quick verdict needs the LLM path** → with no key, the bare `X vs Y` falls back to deterministic (a team situation), not a crisp verdict; documented.

## Open Questions

- Whether the PNG should also embed a couple of headline picks beyond the Final Four — keep it to champion + Final Four + stats for clarity; revisit.
- PDF: add a drawn bracket tree later? Out of scope here.
