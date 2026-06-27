## 1. Tab shell

- [x] 1.1 Make `/` a client tab shell with two tabs in order **Knockouts (default) then Group stage** + active-tab state (linkable via a `?tab=` query param); follow `node_modules/next/dist/docs/`.
- [x] 1.2 Render the bracket predictor as the (default) Knockouts panel and the group dashboard (server-provided data) as the Group panel; show exactly one at a time.
- [x] 1.3 Render a single `ScoutChat` once, as a sibling of the tab content, so it stays mounted (conversation persists) across tab switches.

## 1b. Rebrand to Bracket Agent

- [x] 1b.1 App headline → "FIFA World Cup 2026 Bracket Agent"; remove the "Pocket Scout" headline.
- [x] 1b.2 Update the page/tab title in `app/layout.tsx` metadata (no "Pocket Scout").
- [x] 1b.3 Update the share-card footer to drop "Pocket Scout" (keep original styling).
- [x] 1b.4 Rename the assistant to "the Analyst" in all user-facing copy: chat title ("Ask the Analyst"), answer-source label ("Analyst" instead of "Scout"), tooltips, and the prompt persona (`prompt.ts`: 'You are "the Analyst"…'). Internal `scout` module/capability names stay as-is.
- [x] 1b.5 Confirm behaviour is unchanged: the frozen system prompt is still sent with `cache_control` (cached prefix), answers stay tool-grounded, context-driven (tab-aware), and very brief for token efficiency — only the persona name string changes.

## 2. Shared, tab-aware chat

- [x] 2.1 Lift `picks` + `poolSize` state into the shell (or a shared store) so the one chat can read them; pass down to the Knockouts panel; keep localStorage persistence.
- [x] 2.2 Wire the chat's `extraBody` to send `{ picks, poolSize }` when the Knockouts tab is active (and bracket loaded), and nothing on the Group stage tab.
- [x] 2.3 Remove the per-surface chats (predictor's embedded panel + the dashboard's own) in favour of the single shared panel.

## 3. Lazy bracket data

- [x] 3.1 Fetch `/api/bracket` on first open of the Knockouts tab (loading state); cache for the session; don't fetch on initial Group-stage load.

## 4. Routing

- [x] 4.1 Redirect `/predictor` into the tabbed app with the Knockouts tab active.

## 5. Verification

- [x] 5.1 Verify in the running app (preview): tabs switch without reload; chat conversation persists across switches; Knockouts-tab questions use picks/pool size, Group-tab questions don't; bracket data loads only when the Knockouts tab is opened; `/predictor` lands on the Knockouts tab.

## 6. Spec sync

- [x] 6.1 Confirm implementation matches every scenario in `specs/app-shell/spec.md` and `specs/scout-chat-ui/spec.md`; keep code and specs in sync.
