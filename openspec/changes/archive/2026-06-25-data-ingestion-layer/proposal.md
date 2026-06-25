## Why

Every feature in this app — starting with the Qualification Scenario Engine — depends on the same raw inputs: who is in which group, what fixtures remain, and what the live scores are. These come from undocumented public FIFA JSON endpoints whose shapes are not guaranteed and whose id spaces don't trivially join (player→team needs `squads.json`, not the brief's `squads_fifa.json`). We need one validated, typed, cached ingestion layer so downstream code (engine, LLM, UI) consumes stable domain models and never re-parses raw JSON or re-discovers the join.

## What Changes

- Add a fetch layer for the three public endpoints (`players.json`, `squads.json`, `rounds.json`) with short-TTL caching, since live scores change during matches.
- Add zod-based runtime validation that tolerates additive drift but fails loud on missing/renamed fields we depend on.
- Add a normalization step that joins players→teams via `squads.json` and flattens `rounds[].tournaments[]` into a typed `Fixture` list with explicit status (complete/live/scheduled) and scores.
- Export typed domain models — `Team`, `Group`, `Player`, `Round`, `Fixture` — as the only interface downstream code uses. Raw JSON shapes stay private to this layer.
- Provide a single `loadTournamentSnapshot()` entry point returning a consistent, point-in-time view (teams, groups, fixtures, rounds) for the engine to consume.

## Capabilities

### New Capabilities

- `data-ingestion` — fetch, cache, validate, and normalize the public FIFA WC 2026 JSON into typed domain models, exposing a single tournament-snapshot accessor.

### Modified Capabilities

None (no existing specs).

## Impact

- New code under `lib/data/` (fetch, schema, normalize, models). No UI, no LLM, no auth.
- New dependency: `zod` for validation.
- Foundation for `deterministic-scenario-engine` and `probabilistic-scenario-engine` changes, which consume `loadTournamentSnapshot()` output and add no new data fetching.
- Network dependency on `play.fifa.com` undocumented endpoints; mitigated by validation + caching + a recorded fixture snapshot for tests.
