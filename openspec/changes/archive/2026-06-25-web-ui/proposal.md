## Why

The qualification picture and the Scout are only reachable in code and over JSON. Fans need a visual interface: see each group's standings with who's through, who's out, and each team's advancement odds — and ask the Scout in plain language. This is the product fans actually use, and the differentiator versus a plain scoreboard.

## What Changes

- Add the main dashboard: a card/table per group showing standings, each team's status (clinched / in contention / third-place race / eliminated), and an **advancement probability** indicator, with the win/draw/loss conditional surfaced where a team is contested.
- Add the **Scout chat panel**: a multi-turn, streaming chat that calls the chat API, renders tokens as they arrive, preserves conversation history, and labels whether an answer came from the Scout (LLM) or the deterministic fallback.
- Style with Tailwind in a clean, readable, responsive World Cup layout; make the live group-stage state (clinched/eliminated/contested) glanceable.
- Consume the `web-api` routes; no engine logic in the browser.

## Capabilities

### New Capabilities

- `group-dashboard` — the group standings + advancement-probability views.
- `scout-chat-ui` — the multi-turn streaming Scout chat panel.

### Modified Capabilities

None.

## Impact

- New React/Tailwind components and pages under `app/` (e.g. `app/page.tsx`, `app/components/`).
- Depends on the `web-api` change for data and chat endpoints.
- No new runtime dependencies beyond those added by `web-api` (Next/React/Tailwind); optionally a small client fetch/stream helper.
- Reuses the grounding narration as fallback display text where helpful.
