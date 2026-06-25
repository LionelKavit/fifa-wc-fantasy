## Context

The app consumes three undocumented public endpoints under `https://play.fifa.com/json/fantasy/`. Their shapes were verified live on 2026-06-24 (see `scripts/spike-public-data.mjs` and `openspec/config.yaml` context). Two facts drive the design: (1) the player→team join is `squads.json` (1–48 id space), not `squads_fifa.json`; (2) fixtures live inside `rounds[].tournaments[]`, so no external schedule source is needed. The data updates live during matches, so caching must be short-lived. This layer is the sole dependency of both scenario-engine changes and, later, the UI and LLM.

## Goals / Non-Goals

**Goals:**
- One typed, validated, cached ingestion path; downstream code never touches raw JSON.
- Loud failure on shape drift in fields we depend on; silent tolerance of additive drift.
- A deterministic, recorded snapshot for tests so the engine can be tested offline.
- Pure, side-effect-free normalization that is trivially unit-testable.

**Non-Goals:**
- No authenticated user-team fetch (separate future change; cookie handling deferred).
- No persistence/database — in-memory cache only.
- No player-level analytics or pricing logic; players are normalized but not analyzed here.
- No Next.js/UI wiring.

## Decisions

- **Validation: zod with `.passthrough()` on objects.** Tolerates new fields, fails on missing/retyped required fields. Alternative considered: hand-written type guards — rejected as more code and weaker error messages. Schemas cover only depended-on fields to minimize breakage surface.
- **Caching: in-memory TTL cache keyed per endpoint, short TTL (≈30–60s).** Live scores change mid-match; a long TTL would serve stale standings. Alternative: no cache — rejected, would hammer the endpoints on every engine call. TTL is configurable.
- **Normalization joins eagerly and validates referential integrity.** Any `squadId` with no squad, or any group not of size 4, throws during normalization rather than surfacing as a downstream bug. Alternative: lazy/defensive joins returning `null` — rejected; the data is small and a broken join means broken data we want to catch immediately.
- **`Fixture.status` is normalized to `complete | live | scheduled`.** The raw feed uses round status plus per-tournament status; we collapse to a single enum the engine can branch on. Live in-progress scores are treated as not-yet-final (the engine decides whether to count them).
- **Recorded snapshot fixture for tests.** Commit a captured JSON snapshot (or the spike output) under test fixtures so validation + normalization have golden inputs independent of the network.
- **Module layout:** `lib/data/endpoints.ts` (fetch+cache), `lib/data/schema.ts` (zod), `lib/data/normalize.ts` (join+flatten), `lib/data/models.ts` (types), `lib/data/index.ts` (`loadTournamentSnapshot`).

## Risks / Trade-offs

- **Undocumented endpoints can change without notice** → validation fails loud with field paths; recorded snapshot keeps tests green; thin schema limits blast radius.
- **Short TTL increases request volume during active viewing** → acceptable given three small static-CDN files; TTL configurable if rate issues appear.
- **Live (in-progress) scores are ambiguous for standings** → snapshot exposes `live` status explicitly and leaves the count/ignore decision to the engine, not the data layer.
- **Counting a half-time score as final would mislead** → `Fixture.status` distinguishes `live` from `complete`; engine specs decide handling.

## Migration Plan

Greenfield; no migration. Land `lib/data/` plus tests and the recorded fixture. Add `zod` to dependencies. Verified by unit tests against the recorded snapshot and one live smoke test.

## Open Questions

- Exact cache TTL value and whether to expose a manual `refresh()` — defer to implementation; default 60s.
- Whether to persist the recorded snapshot as raw endpoint JSON vs. normalized output — lean raw, to also exercise validation/normalize in tests.
