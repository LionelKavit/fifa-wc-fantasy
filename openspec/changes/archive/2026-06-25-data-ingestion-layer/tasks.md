## 1. Project & dependencies

- [x] 1.1 Initialize TypeScript project config (tsconfig, Vitest) if not present, matching the planned `lib/` layout
- [x] 1.2 Add `zod` dependency
- [x] 1.3 Capture a recorded raw snapshot of all three endpoints into `lib/data/__fixtures__/` for offline tests

## 2. Domain models

- [x] 2.1 Define `Team`, `Group`, `Player`, `Round`, `Fixture` types in `lib/data/models.ts`
- [x] 2.2 Define `TournamentSnapshot` type aggregating teams, groups, players, rounds, fixtures

## 3. Schema & validation

- [x] 3.1 Write zod schemas for `players.json`, `squads.json`, `rounds.json` covering only depended-on fields, with passthrough for extras
- [x] 3.2 Implement validation that fails with endpoint + field-path on missing/retyped required fields
- [x] 3.3 Unit-test validation: extra fields pass; missing/retyped required field fails with a useful message

## 4. Fetch & cache

- [x] 4.1 Implement per-endpoint fetch over HTTPS with typed fetch errors (endpoint + status) in `lib/data/endpoints.ts`
- [x] 4.2 Add in-memory short-TTL cache (configurable, default 60s); do not cache failed responses
- [x] 4.3 Unit-test cache hit-within-TTL serves without network and non-200 raises typed error

## 5. Normalization

- [x] 5.1 Join players→teams via `squads.json` (1–48); throw on any unmatched `squadId`
- [x] 5.2 Build 12 groups of 4 from `squads[].group`; throw if any group size ≠ 4
- [x] 5.3 Flatten `rounds[].tournaments[]` to `Fixture[]` with `complete|live|scheduled` status, scores, round id and stage
- [x] 5.4 Unit-test normalization against the recorded snapshot: 48 teams, 12 groups of 4, all players mapped, group fixtures filterable, completed fixtures carry scores

## 6. Snapshot accessor

- [x] 6.1 Implement `loadTournamentSnapshot()` in `lib/data/index.ts` from one coherent fetch cycle, returning only typed models
- [x] 6.2 Live smoke test that `loadTournamentSnapshot()` resolves against the real endpoints and passes structural assertions
- [x] 6.3 Verify no raw endpoint shapes are exported from the data layer's public entry point
