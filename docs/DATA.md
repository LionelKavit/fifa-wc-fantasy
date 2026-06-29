# Data sources

The Bracket Analyst reads three **public, undocumented** JSON endpoints under
`https://play.fifa.com/json/fantasy/` (no auth, same tolerated status as FPL's
unofficial API). The ingestion layer (`lib/data`) fetches, caches, validates,
and normalizes them; everything downstream consumes typed domain models, never
the raw shapes. Two **committed, static** inputs round out the data: the Elo
ratings snapshot and the World Cup history dataset (see below).

| Endpoint | What it is |
|---|---|
| `players.json` | ~1,489 players: `{ id, firstName, lastName, knownName, squadId, position, price, status, percentSelected, stats{…}, … }` |
| `squads.json` | The **48 teams**: `{ id (1–48), name, abbr, group (a–l), isEliminated }` |
| `rounds.json` | 8 rounds (3 GROUP + R32/R16/QF/SF/F). Each round **embeds its fixtures** in `tournaments[]` with `homeSquadId`/`awaySquadId` (1–48 space), scores, and goalscorers |

## The team-join finding ⚠️

The single most important data fact, and an easy trap:

> **The player → team join is `squads.json`, NOT `squads_fifa.json`.**

- `squads.json` — 48 teams, id space **1–48**, **1:1** with `players[].squadId`. Carries `isEliminated`.
- `squads_fifa.json` — a *different* file: only 32 teams, a large id space (43817+), **zero** overlap with `players[].squadId`. It is the wrong key.

So joining players/fixtures to team names goes through `squads.json`.

## Other notes

- **Fixtures live inside `rounds.json`** (`tournaments[]`), keyed by the 1–48 squad space — so no external schedule/results source is needed.
- **Format:** 12 groups of 4 → top 2 of each group **plus the 8 best third-placed teams** advance to the Round of 32.
- **Fixture status** is normalized to `complete | live | scheduled`. Completed fixtures carry integer scores; scheduled have `null`; anything in progress maps to `live`.
- **Goal events** on each fixture (`homeGoalScorersAssists` / `awayGoalScorersAssists`) are normalized onto `fixture.goals` as `{ playerId, assistId, isOwnGoal }`. These drive the current-tournament Golden Boot race and the live all-time scoring record (own goals excluded from scorer credit). Player ids join to `players.json`.
- **No match minute** is exposed, which is why live-conditioned probabilities use a fixed remaining-goals fallback rather than time-scaling (see [ARCHITECTURE.md](ARCHITECTURE.md)).
- **No disciplinary data** is exposed, so the FIFA fair-play tiebreaker can't be computed and degrades to a deterministic drawing-of-lots (by team id).
- These endpoints are **undocumented and may change without notice.** The zod validation layer fails loud (naming the endpoint + field path) on drift, and a committed snapshot (`lib/data/__fixtures__/`) keeps the tests reproducible offline.

## Committed, static data

Two inputs are committed to the repo and **never fetched at runtime**:

- **Elo ratings** (`lib/data/ratings.json`) — a per-team rating snapshot, converted to Poisson
  strength multipliers that drive every probability (`lib/engine/strength.ts`). It is a
  point-in-time snapshot, not a live rating feed.
- **World Cup history** (`lib/data/world-cup-history.json`) — every tournament **1930–2022**,
  parsed once offline from the [RSSSF](https://www.rsssf.org) full-match archives
  (`scripts/ingest-wc-history.py`): host, champion/runner-up, final, ~99% of match results
  (a small, documented residual of obscure replays omitted), and curated Golden Boots + an
  all-time top-scorer list. It is **historical color only** — it never feeds a 2026 prediction —
  and it ends at 2022 (the in-progress tournament is not included).

## Verifying the data yourself

A zero-dependency spike script dumps a sanity report (counts, distributions, the join check):

```bash
node scripts/spike-public-data.mjs
```

## Authenticated user data (not used)

FIFA also exposes a user's own fantasy team at `GET /api/en/fantasy/team`, but it
requires the user's browser session cookie. The Bracket Analyst deliberately uses only
the public, unauthenticated data above — there is no per-user login.
