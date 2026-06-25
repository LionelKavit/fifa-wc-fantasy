## Context

The library layers are done and tested; this change puts an HTTP/Next.js boundary in front of them. The reference app (`~/Desktop/fpl-advisor`) establishes the pattern: Next.js App Router, route handlers under `app/api/*/route.ts`, React 19, Tailwind 4, `output: "standalone"`, with the Scout-style chat at `app/api/ask/route.ts`. The brief flags this as a non-standard Next.js — its docs live under `node_modules/next/dist/docs/` and MUST be read before writing app code. The server is the trust boundary: it holds the Anthropic key and runs the Monte Carlo.

## Goals / Non-Goals

**Goals:**
- A Next.js app shell that serves the UI (next change) and the API.
- A cached data provider so the ~50k-trial simulation runs on a schedule, not per request.
- Read endpoints for groups/situations and a streaming, multi-turn Scout chat endpoint.
- Keyless fallback works over HTTP; key + any future cookies stay server-side.

**Non-Goals:**
- No UI components (the `web-ui` change owns those).
- No authenticated per-user FIFA team features.
- No new engine/grounding/scout logic — this is a transport layer over existing libraries.
- No database — in-memory caching only.

## Decisions

- **Next.js App Router + route handlers**, mirroring fpl-advisor. Data reads are `GET` handlers; chat is a `POST` handler. Alternative: a separate server — rejected, Next handles both UI and API and matches the reference architecture.
- **Read the non-standard Next docs first.** Before any `app/` code, read `node_modules/next/dist/docs/` (the repo pins a non-standard Next, per the brief). Treat its conventions as authoritative over generic Next knowledge.
- **Cached data provider, not per-request simulation.** A server module loads the snapshot and computes the advancement report once, caching both with a short TTL (and refreshing in the background). Requests read the cache. This keeps responses fast and the simulation cost bounded. Alternative: simulate per request — rejected (~0.5–1s each).
- **Stream chat via a `ReadableStream` response.** The `POST` chat handler consumes `streamScout(...)` and pipes chunks to a streaming HTTP response so the UI renders progressively; the keyless path returns the deterministic answer (single chunk). Tag the response with the answer source. Alternative: buffered JSON — rejected, loses the streaming UX the Scout was built for.
- **Server-only modules.** The data provider and chat handler import `lib/scout` / `lib/data` only on the server; the API key is read from `process.env` inside the handler and never serialized. Enforced by keeping these imports out of client components.
- **Validate request bodies.** The chat route validates that a question string is present and that history (if any) is well-formed, returning a 4xx on malformed input.

## Risks / Trade-offs

- **Non-standard Next.js surprises** → read `node_modules/next/dist/docs/` before coding; follow its route-handler and streaming conventions, not assumptions.
- **Monte Carlo cost on cold cache** → first request after expiry pays once; background refresh and a short-but-not-tiny TTL smooth it; trial count is tunable.
- **Undocumented FIFA endpoints drift** → already handled by the data layer's validation; the provider surfaces a clear error if a fetch fails.
- **Key leakage** → key read only inside server route handlers; no client import; reviewed.
- **Streaming differences across runtimes (node vs edge)** → pick the node runtime for the chat route (the Anthropic SDK + Monte Carlo need node); declare it explicitly.

## Migration Plan

Greenfield app shell added alongside the existing `lib/`. Install `next`/`react`/`react-dom`/`tailwindcss`; scaffold `app/` per the non-standard docs; add the data provider + routes. Verify with route-level tests (data provider caching, chat handler with a mocked Scout) and a manual `next dev` smoke check. Depends on the `scenario-grounding` and `scout-agent` libraries (already built).

## Open Questions

- Exact streaming transport (SSE vs chunked text) — decide against the non-standard Next docs at implementation.
- TTL value and whether to pre-warm the report at server start — default a short TTL + lazy compute; pre-warm if cold-start latency is noticeable.
- Whether to expose a single `/api/groups` returning all situations vs. per-group routes — likely both (a list summary + per-group detail).
