# Design — current-tournament scorers

## Source shape (verified against the live feed)

Each `rounds.json` fixture carries:

```jsonc
"homeGoalScorersAssists": [{ "playerId": 750, "assistId": 759, "isOwnGoal": false }, ...],
"awayGoalScorersAssists": null,          // null when that side did not score
"homePenaltyScore": 0, "awayPenaltyScore": 0, "period": "full_time", ...
```

- `playerId` joins to `players.json` (`id`), which has names; `players[].squadId` joins to
  the team → nation.
- For an **own goal**, the entry sits under the side that *benefited* and `playerId` is the
  opposing player who scored into their own net. Own goals are **not** credited to a player
  as a goal (Golden Boot convention), so the aggregation excludes `isOwnGoal: true` from
  scorer credit. We still surface the flag so callers could display own goals if needed.
- `assistId` is nullable.

## Data layer

- **schema.ts**: add a `RawGoalSchema` (`playerId: number`, `assistId: number | null`,
  `isOwnGoal: boolean`, `.passthrough()`), and on `RawFixtureSchema` add
  `homeGoalScorersAssists` / `awayGoalScorersAssists` as `array(RawGoalSchema).nullable().optional()`
  (absent on scheduled fixtures, `null` when a side did not score). Tolerant of drift as
  before.
- **models.ts**: add `GoalEvent { playerId: number; assistId: number | null; isOwnGoal: boolean }`
  and `Fixture.goals: GoalEvent[]` (flattened home then away). No new top-level model.
- **normalize.ts**: concatenate the two raw arrays (each defaulting to `[]`) into
  `fixture.goals`. No referential validation on `playerId` here (a scorer may occasionally
  not resolve to a roster entry); resolution happens in the aggregation and is reported
  honestly when it fails.

## Engine aggregation — `lib/engine/currentScorers.ts` (pure)

Operates on a `TournamentSnapshot` (and, for the record view, the committed history list).

- `currentTopScorers(snapshot, limit?)`: walk `snapshot.fixtures[].goals`; for each
  non-own-goal, credit the scorer; credit assists by `assistId`. Join `playerId` →
  `snapshot.players` (name) → team (nation). Return
  `{ playerId, name, nation, goals, assists }[]` sorted by goals desc, then assists, then
  name. Counts goals from `complete` **and** `live` fixtures (goals so far). This is the
  live Golden Boot race.
- `allTimeScoringRecord(snapshot)`: take the committed historical all-time top-scorer list
  (through 2022). For each historical scorer, try to match an **active** player by
  **nation + name** (diacritic-insensitive; compare last name / last token; small alias
  map for safety); if matched, `careerGoals = historicalGoals + goals2026`, else
  `careerGoals = historicalGoals`. Re-sort to get the live leader; report the previous
  record (max historical) and `broken: leader.careerGoals > previousRecord.goals` with the
  player who broke it. The board augments the **known leaders** — the only players whose
  full career WC total we can ground — which is exactly who can hold the record. A 2026
  newcomer (not on the historical list) appears in `currentTopScorers` but not as a career
  leader, since their pre-2026 WC total is unknown.

### Why combine at runtime, not bake into the dataset

The committed `world-cup-history.json` stays a clean, reproducible "through 2022" artifact.
The live record is a *derived* view (history + current snapshot), so it updates every fetch
cycle without rewriting the dataset, and the historical tool keeps its honest as-of-2022
framing.

## Scout tools

- `get_current_top_scorers()` → top scorers of the 2026 tournament so far (compact list:
  `Name (Nation) — N goals[, M assists]`), from `currentTopScorers(ctx.snapshot)`. Reports
  "no goals recorded yet" honestly if empty.
- `get_wc_scoring_record()` → from `allTimeScoringRecord(ctx.snapshot)`: the live all-time
  leader and total, whether the previous record is broken and by whom, and a short board.
- `get_wc_top_scorers` is unchanged — the **historical, through-2022** tool (keeps `asOf`).

The Analyst picks: "current / this year / so far" → `get_current_top_scorers`; "all-time /
record / has the record been broken" → `get_wc_scoring_record`; "in <year>" or "historical
all-time through 2022" → `get_wc_top_scorers`.

## Grounding (unchanged rule, reaffirmed)

Goalscorers are descriptive color. They MUST NOT feed or alter any WC2026 probability,
projected finish, or pick — those still come only from the engine odds/prediction tools.
Player-form modelling remains out of scope.

## Testing

- **normalize**: a fixture with home/away goal arrays (incl. an own goal and a null side)
  surfaces the expected `fixture.goals`; a scheduled fixture has `goals: []`.
- **currentScorers**: on a small synthetic snapshot — goals counted, own goals excluded,
  assists counted, sorted; nation joined. Record combine: a synthetic "Lionel Messi"
  (Argentina) with enough 2026 goals pushes his career total past the historical record →
  `broken: true` with him as the breaker; with zero 2026 goals → `broken: false` and the
  historical record holder leads.
- **tools**: both new tools return grounded strings on a fixture context and report
  emptiness honestly.

## Verification

Live `/api/chat`: "Who's the top scorer at the 2026 World Cup?" and "Has the all-time World
Cup scoring record been broken?" — answers grounded in the new tools and consistent with
the live feed; a WC2026 odds/pick question still draws its numbers from the engine tools.
