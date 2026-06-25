## Why

The engine, grounding, and Scout layers are callable TypeScript libraries, but nothing serves them to a browser. To ship the product we need a Next.js app and a server-side API: a cached tournament-data provider and a Scout chat endpoint (streaming, multi-turn). The server is also where the Anthropic key lives, so the LLM and the Monte Carlo never run on the client.

## What Changes

- Scaffold the Next.js application (App Router, React, Tailwind), following the repo's non-standard Next.js docs under `node_modules/next/dist/docs/` before writing app code.
- Add a server-side **tournament data provider**: loads a `TournamentSnapshot`, computes the advancement report once and caches it (short TTL, refreshed in the background), and exposes groups, situations, and probabilities. This keeps the ~50k-trial Monte Carlo off the request hot path.
- Add **read API routes** for the qualification picture: list groups, and get a group's grounded situation (standings + per-team verdict + advancement probability).
- Add a **Scout chat API route**: accepts a question plus prior conversation turns and streams the answer over HTTP; when no API key is configured it returns the deterministic grounded answer instead.
- Keep `ANTHROPIC_API_KEY` (and any future FIFA cookies) server-side only — never imported into client modules.

## Capabilities

### New Capabilities

- `tournament-data-api` — server data provider + read routes for groups, situations, and advancement probabilities.
- `scout-chat-api` — the Scout chat HTTP route (streaming, multi-turn, keyless fallback).

### Modified Capabilities

None.

## Impact

- New Next.js app: `app/` (layout, route handlers under `app/api/`), `next.config`, Tailwind/PostCSS config, server-only data provider under `lib/server/`.
- New dependencies: `next`, `react`, `react-dom`, `tailwindcss` (+ PostCSS). `@anthropic-ai/sdk` already present.
- Consumes the existing `lib/data`, `lib/engine`, `lib/grounding`, `lib/scout` libraries unchanged.
- Consumed by the `web-ui` change (the frontend calls these routes).
- No public per-user team auth; all endpoints read public data + the server Scout.
