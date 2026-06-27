## Context

`scout-bracket-tools` gives the one Scout bracket/tracker tools. Those tools need the user's picks (and, for later strategy advice, pool size). The existing `/api/chat` route streams the Scout over a question + history. This change threads optional context through that **same** route and adds a chat panel on the predictor — no fork, per the one-Scout principle in CLAUDE.md.

## Goals / Non-Goals

**Goals:**
- The single chat endpoint accepts optional `picks` + `poolSize`, backward compatible.
- A predictor chat panel that sends the current bracket + pool size.
- A small pool-size control.

**Non-Goals:**
- New endpoints; changes to streaming/key handling; the tools themselves (`scout-bracket-tools`); the strategy advice (Phase 2).
- Persisting pool size server-side (it rides with the request; client may keep it locally).

## Decisions

**1. Context rides on the existing request body; absence = today's behaviour.**
Add optional `picks` (matchId→teamId) and `poolSize` to the chat request. The route passes them into the Scout's tool-execution context. No context ⇒ the bracket tools report "no bracket," and group-stage answers are unchanged — so the dashboard chat needs no change.

**2. Reuse the `ScoutChat` component.**
The predictor panel reuses the existing chat UI, parameterized to attach the current picks (from the predictor's local state) and pool size to each send. Avoids a second chat implementation.

**3. Pool size is a lightweight client value.**
A small input on `/predictor` (default sensible, e.g. 10). It travels with the bracket context. Strategy advice (Phase 2) consumes it; here we only capture and pass it.

**4. Validation is lenient.**
Malformed/oversized context is ignored (answer the question without bracket facts) rather than failing the request — the question is the primary input.

## Risks / Trade-offs

- **Payload size (a full bracket each message)** → picks are tiny (≤31 id pairs); negligible.
- **Two chat instances (dashboard + predictor) diverging** → reuse one component; only the attached context differs.
- **Non-standard Next.js** → follow `node_modules/next/dist/docs/` for the route/component wiring.

## Open Questions

- Whether the predictor chat and the existing scoring panel share screen space or toggle — a layout choice for implementation/design review.
- Default pool size and whether to remember it locally — minor; default ~10, optionally persist in localStorage.
