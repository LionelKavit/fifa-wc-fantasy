# Ingest current-tournament goalscorers → live Golden Boot + scoring record

## Why

The live FIFA feed we already fetch every cycle (`rounds.json`) carries per-match goal
events — `homeGoalScorersAssists` / `awayGoalScorersAssists` arrays of
`{ playerId, assistId, isOwnGoal }`, plus penalty scores and clock/venue. The data layer
currently validates only the scoreline and **drops** the goal events (they fall through
`.passthrough()` and `normalize.ts` never surfaces them). So the Analyst cannot answer
"who's the current top scorer?" and — more pointedly — when an active player breaks the
**all-time** World Cup scoring record during 2026, the Analyst would still quote the
through-2022 record (Klose 16) because the committed history dataset ends at 2022.

We have everything needed to fix this from data we already pull: aggregate the goal events
by `playerId`, join to player names + nations, and (for the all-time picture) add the
historical career totals from the committed history dataset. This makes the live Golden
Boot race and the live scoring record grounded and current.

## What changes

- **Data layer**: validate and surface goal/assist events. `schema.ts` gains the
  `homeGoalScorersAssists` / `awayGoalScorersAssists` shapes on a fixture; `models.ts`
  gains a `GoalEvent` type and a `goals: GoalEvent[]` field on `Fixture`; `normalize.ts`
  flattens both arrays onto each fixture (empty when absent). Own goals are retained with
  their `isOwnGoal` flag so they can be excluded from scorer credit.
- **Engine (pure)**: a new `currentScorers` module that aggregates the snapshot's goal
  events into the **current-tournament top scorers** (goals — excluding own goals — and
  assists, per player, joined to nation, ranked), and an **all-time scoring record** view
  that augments the committed historical top-scorer list with each player's 2026 goals
  (matched by nation + name) to report the live career leader and whether the previous
  record has been broken.
- **Scout tools**: `get_current_top_scorers()` (the 2026 Golden Boot race) and
  `get_wc_scoring_record()` (live all-time career board incl. 2026 + whether/by whom the
  record is broken). The existing `get_wc_top_scorers` stays the historical, through-2022
  tool.
- **Persona**: the Analyst answers "current/this-year top scorer" from the live tool, and
  "has the all-time record been broken?" from the record tool; it still treats scorers as
  historical/contextual color and **never** lets them change any WC2026 probability,
  projected finish, or pick.

## Impact

- Affected specs: `data-ingestion` (goal events), `scout-tools` (two new tools + record
  framing). Touches `lib/data/{schema,models,normalize}.ts`, new
  `lib/engine/currentScorers.ts`, `lib/scout/{tools,prompt}.ts`, and tests.
- No change to the prediction/odds model: goalscorers remain Analyst color, not model
  inputs (player-form modelling stays out of scope, as previously decided).
- The committed `world-cup-history.json` is unchanged (still through 2022); the live
  record view is computed at runtime by combining it with the snapshot.

## Out of scope

- Detailed match stats (possession, shots, xG, cards) — not present in the feed.
- Full career World Cup totals for players absent from the curated historical top list
  (the record board augments the known leaders, which is who can actually hold the record).
- Feeding goals/form into the prediction model (deferred "Part B").
- Persisting 2026 scorers into the historical dataset after the tournament.
