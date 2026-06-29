## Why

The Analyst is the "expert friend who knows every team." Right now it knows the *current* model cold but has **no World Cup history** — it can't say "these two have met four times at the World Cup" or "Germany have reached four finals since 1990." The RSSSF full match archives (1930–2022) are public, trusted facts that fill that gap and make the Analyst feel genuinely knowledgeable.

This is **strictly Analyst context** — qualitative historical color, grounded in facts. It does **not** touch the prediction model (Part B is out): WC2026 probabilities/standings stay engine-sourced. History is a separate, factual knowledge store the Analyst can cite.

## What Changes

- **A committed World Cup history dataset (1930–2022).** Parsed **once, offline** from the RSSSF "full" pages into a structured `world-cup-history.json`, then committed — **no runtime fetching** (history is fixed, which sidesteps live-fetch/ToS concerns; RSSSF is reusable with attribution).
- **Robust high-value layer only.** Per tournament: host, champion, final/finalists, knockout results, group standings, and the **top-scorer summary**; the full **match results** (date, stage, teams, score). We **skip** lineups, subs, cards, referees, and minute-level per-match scorers (brittle to parse across eras, low Analyst value, and absent for 2022).
- **Derived all-time aggregates** computed from the dataset: per-nation WC **record** (appearances, titles, finals/semis reached, W-D-L, GF/GA, best finish), a **head-to-head index** of WC meetings, and **all-time top-scorer tallies** (aggregated from each tournament's scorer summary).
- **A few Scout tools** exposing compact, grounded history facts — e.g. `get_wc_record(team)`, `get_wc_head_to_head(a, b)`, `get_wc_top_scorers(year?)`, `get_wc_champions()`. The Analyst answers history questions via these tools (never guessing), as color — and history is **never** used to produce or alter WC2026 odds.
- **No UI and no model change.**

## Capabilities

### New Capabilities
- `world-cup-history`: a committed, trusted dataset of World Cup results/standings/champions/top-scorers (1930–2022) plus derived all-time aggregates (team records, head-to-head index, scorer tallies), generated offline and loaded server-side.

### Modified Capabilities
- `scout-tools`: adds World Cup history tools that return compact grounded facts from the history dataset; the Analyst uses them for historical questions and never lets history influence WC2026 probabilities.

## Impact

- **Data** (`lib/data/` + an offline script, e.g. `scripts/ingest-wc-history.ts`): a one-time parser turns the RSSSF full pages into `world-cup-history.json` (committed). The parser tolerates per-era format drift; pages that are sparse (2022f) contribute what they have (results + standings + tournament top scorer). Provenance + RSSSF attribution recorded in the file.
- **Engine/server** (`lib/engine` or `lib/server`): a pure loader + aggregation (team records, head-to-head, all-time scorers), cached; a small **alias map** merges the widely-accepted successor state (West Germany → Germany) and keeps other historical names (Soviet Union, Yugoslavia, Czechoslovakia, East Germany) distinct and labelled.
- **Scout** (`lib/scout/tools.ts`, `lib/scout/prompt.ts`): new history tools + a brief prompt line so the Analyst knows it can answer WC-history questions, grounded, as color.
- **No change** to the probability model, scoring, the predictor UI, or the live data pipeline. The history store and the WC2026 engine are disjoint domains, so there's no contradiction surface.
