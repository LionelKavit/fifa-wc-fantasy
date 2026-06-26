## Why

The unified Scout (`scout-bracket-tools`) can answer bracket and tracker questions — but only if it actually receives the user's picks. This change is the plumbing: the single chat endpoint accepts optional context (the user's picks + pool size), and the predictor surface gets a Scout chat panel that sends them. One endpoint, one agent; the dashboard chat is unchanged.

## What Changes

- Extend the **chat request** to carry optional context: the user's current/saved **picks** (a prediction) and **pool size**. When present, the Scout's bracket tools can use them; when absent, the Scout behaves exactly as today (group-stage answers). **Same endpoint** — no fork.
- Add a small **pool-size input** the user can set (e.g. "How many in your pool?"), passed along so later strategic advice can calibrate.
- Add a **Scout chat panel on the predictor surface** (`/predictor`) that sends the in-progress picks + pool size with each message, so a user can ask "is this pick smart?" / "how's my bracket?" right next to the bracket.
- Keep the existing dashboard chat working unchanged (it simply sends no bracket context).

This is **API + UI + spec only**; it consumes the tools defined in `scout-bracket-tools` and changes no engine behaviour.

## Capabilities

### New Capabilities
<!-- None; extends existing chat capabilities. -->

### Modified Capabilities
- `scout-chat-api`: the chat route SHALL accept optional bracket context (picks + pool size) on a request and make it available to the Scout's tools, remaining backward compatible (absent context ⇒ unchanged behaviour) and still single-endpoint.
- `scout-chat-ui`: a Scout chat panel SHALL be available on the predictor surface, sending the current picks + pool size with each message; the dashboard chat is unchanged.

## Impact

- **API** (`app/api/chat`): accept and validate optional `picks` + `poolSize`; thread them into the Scout's tool context. Server-side key handling and streaming unchanged.
- **UI** (`app/`): a chat panel on `/predictor` (reusing the existing `ScoutChat` component where possible) wired to the current bracket state + a pool-size control. Original styling.
- **Depends on** `scout-bracket-tools` (the tools that consume the context) and `bracket-predictor-ui` (the picks state). No engine changes.
- **No** new endpoint; the dashboard chat keeps working with no context.
