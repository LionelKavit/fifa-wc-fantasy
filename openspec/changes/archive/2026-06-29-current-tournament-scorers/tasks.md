## 1. Data layer — surface goal events

- [x] 1.1 `schema.ts`: add `RawGoalSchema` (`playerId`, `assistId` nullable, `isOwnGoal`, passthrough) and add `homeGoalScorersAssists`/`awayGoalScorersAssists` (`array(RawGoalSchema).nullable().optional()`) to `RawFixtureSchema`.
- [x] 1.2 `models.ts`: add `GoalEvent` type and `goals: GoalEvent[]` to `Fixture`.
- [x] 1.3 `normalize.ts`: flatten home then away goal arrays onto `fixture.goals` (default `[]`), preserving `isOwnGoal`.

## 2. Engine — current scorers + record (pure, tested)

- [x] 2.1 New `lib/engine/currentScorers.ts`: `currentTopScorers(snapshot, limit?)` — aggregate goals (exclude own goals) and assists per player, join playerId→player→nation, rank.
- [x] 2.2 `allTimeScoringRecord(snapshot)` — augment the committed historical top-scorer list with 2026 goals (match by nation + diacritic-insensitive name, small alias map), report leader/total, `broken`, breaker, and a short board.
- [x] 2.3 Export the new functions/types from `lib/engine/index.ts`.

## 3. Scout tools + persona

- [x] 3.1 `lib/scout/tools.ts`: add `get_current_top_scorers()` and `get_wc_scoring_record()` tool defs + handlers (compact grounded output; honest emptiness), using `ctx.snapshot`.
- [x] 3.2 `lib/scout/prompt.ts`: list the two new tools and the routing rule (current/record vs. historical through-2022); reaffirm scorers are color only, never model numbers.

## 4. Tests

- [x] 4.1 `normalize`: a fixture with home/away goal arrays (incl. an own goal and a null side) surfaces `fixture.goals`; a scheduled fixture has `goals: []`.
- [x] 4.2 `currentScorers`: goals counted, own goals excluded, assists counted, sorted, nation joined; record combine yields `broken: true` with a synthetic record-breaker and `broken: false` otherwise.
- [x] 4.3 `tools`: both new tools return grounded facts on a fixture context and report emptiness honestly.

## 5. Verify

- [x] 5.1 Live `/api/chat`: "Who's the top scorer at the 2026 World Cup?" and "Has the all-time World Cup scoring record been broken?" — answers grounded in the new tools and consistent with the live feed. A WC2026 odds/pick question still gets its numbers from the engine tools. No console/server errors.

## 6. Spec sync

- [x] 6.1 Confirm code matches the deltas in `specs/data-ingestion/spec.md` and `specs/scout-tools/spec.md`; keep code and specs in sync.
