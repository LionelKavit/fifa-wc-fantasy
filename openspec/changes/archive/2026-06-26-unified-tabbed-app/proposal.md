## Why

Today the app is split across two routes — `/` (group tables + chat) and `/predictor` (knockout bracket + its own chat). The product is one "expert friend," so it should feel like one interface: tabs to switch views, with a single Scout chat that stays put. The two moments of need (group stage now, knockouts when filling a bracket) become two tabs of the same app, sharing one conversation.

## What Changes

- Combine both surfaces into **one page with tabs**, in order: a **Knockouts** tab (the bracket predictor — make picks, evaluate, lock & export) shown **first and by default**, and a **Group stage** tab (group tables only) **second**.
- **Rebrand** the app headline to **"FIFA World Cup 2026 Bracket Agent"** and remove all user-facing "Pocket Scout" naming (headline, page/tab title, share card). The in-app assistant stays "the Scout".
- Provide **one shared Scout chat**, common to both tabs and **persistent across tab switches** (the conversation is kept; the panel does not remount).
- Make the chat **tab-aware**: on the Knockouts tab it sends the current picks + pool size; on the Group stage tab it sends none (group-stage behaviour). Same single endpoint and agent.
- The bracket tab's data is **loaded when first opened** (not on initial page load), so a user who only wants group tables doesn't pay the bracket simulation cost.
- Fold the two routes into the single interface (the old `/predictor` redirects to the Knockouts tab).

## Capabilities

### New Capabilities
- `app-shell`: a single tabbed interface (Group stage / Knockouts) with one persistent, tab-aware Scout chat shared across tabs; lazy-loads the bracket tab's data.

### Modified Capabilities
- `scout-chat-ui`: replace the two per-surface chat panels with **one shared chat** that persists across tabs and carries bracket context only when the Knockouts tab is active.

## Impact

- **UI** (`app/`): `/` becomes a client tab shell hosting the existing group dashboard and bracket predictor as tab panels, with a single `ScoutChat` island rendered once (outside the tab content so it persists). The group dashboard stays server-rendered for its data; the bracket panel fetches its data on first open (reusing `/api/bracket` + `/api/predictor/evaluate`). `/predictor` redirects into the tabbed app.
- **No engine/API changes** — same Scout endpoint, same predictor endpoints, same data provider. This is layout + wiring.
- **Depends on** `group-dashboard`, `bracket-predictor-ui`, and `scout-chat-ui`/`scout-chat-api` (the unified-context chat already built).
- **Note (non-standard Next.js)**: follow `node_modules/next/dist/docs/` for the route/layout wiring.
