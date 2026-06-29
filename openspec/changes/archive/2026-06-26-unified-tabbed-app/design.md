## Context

`/` is a server component (group dashboard + a `ScoutChat`); `/predictor` is a client island (`BracketPredictor`) with its own `ScoutChat`. The unified chat endpoint already accepts optional bracket context. The goal: one page, two tabs, one persistent shared chat — without re-architecting the engine or API.

## Goals / Non-Goals

**Goals:**
- One page, tabs (Group stage / Knockouts), client-side switching.
- A single `ScoutChat` rendered once and kept mounted across tab switches (conversation persists).
- Chat context reflects the active tab (bracket picks + pool size only on Knockouts).
- Lazy-load bracket data on first Knockouts open.

**Non-Goals:**
- Engine/API changes (same endpoints). New chat behaviours (already built). Tracker mode / round-wise (separate, deferred).

## Decisions

**1. `/` becomes a client tab shell; chat lives outside the tab content so it persists.**
Layout: a header titled "FIFA World Cup 2026 Bracket Agent" with two tab buttons (**Knockouts** first/default, **Group stage** second), a main area that swaps between the Knockouts panel and the Group panel, and the `ScoutChat` rendered once (a sibling of the tab content, not inside it). Because the chat is not unmounted when tabs switch, its conversation state is retained automatically. Active-tab state is client state in the shell. Rebrand: drop "Pocket Scout" from all user-facing surfaces (headline, `layout.tsx` title metadata, share-card footer); the chat assistant stays "the Scout".

**2. Group data stays server-rendered; bracket data is lazy and client-fetched.**
The group dashboard needs no simulation, so the shell's server component fetches group data and passes it to the Group panel (server-rendered as today). The bracket needs a ~20k-trial sim, so the Knockouts panel fetches `/api/bracket` on first open (client), shows a loading state, and caches it for the session. This keeps the initial load cheap for group-only users — the key reason not to eager-render the bracket.

**3. The shared chat reads the active tab + current picks via a small context.**
`ScoutChat` already takes an `extraBody()` callback. The shell passes one that returns `{ picks, poolSize }` when the Knockouts tab is active and the bracket is loaded, else `{}`. Picks + pool size live in the shell (lifted out of `BracketPredictor`) or are exposed via a ref/state the shell reads, so the single chat can see them regardless of which tab is showing.

**4. Lift bracket pick state into the shell (or a shared store).**
Today `BracketPredictor` owns picks/poolSize. To let the one chat send them while on the Knockouts tab, the shell needs access. Simplest: lift `picks` + `poolSize` state into the shell and pass down to the Knockouts panel; the chat's `extraBody` reads them. (Local-storage persistence stays as-is, keyed to the R32 identity.)

**5. `/predictor` redirects into the tabbed app.**
Keep the URL working: `/predictor` redirects to `/` with the Knockouts tab active (e.g. `/?tab=knockouts` or a hash), so existing links/bookmarks land on the bracket.

**6. The rename is display-only; assistant behaviour is untouched.**
"the Analyst" changes only user-facing strings and the persona name inside the existing frozen system prompt. Everything else stays exactly as the `scout-conversation` requirements already mandate: the grounded tool-use loop, the system prompt sent with `cache_control` (still a stable cached prefix — editing the name re-caches once, then caches as before), the tab-aware context input, and the brief, plain, token-efficient answers. No change to the model, tools, loop, or brevity rules — only the words "Scout"→"Analyst" / "Pocket Scout"→"Bracket Agent" in copy.

## Risks / Trade-offs

- **Lifting pick state** touches `BracketPredictor`'s internals → keep the change mechanical (move `picks`/`poolSize` up, pass as props) and re-verify scoring/persistence still work.
- **Server vs client data mix** (group server-rendered, bracket client-fetched) → fine; the shell is a client component that renders the server-provided group panel as a child and lazy-loads the bracket.
- **Non-standard Next.js** routing/redirect → follow `node_modules/next/dist/docs/`.
- **Chat width on the group tab** (group dashboard already had a sidebar chat) → the shared chat takes that role; ensure layout works for both tabs.

## Open Questions

- Tab affordance + deep-linking: query param (`?tab=`) vs hash vs in-memory only — default to a query param so tabs are linkable; confirm in implementation.
- Chat placement (right sidebar across both tabs vs a collapsible panel) — default to the existing right-sidebar treatment; design-review later.
