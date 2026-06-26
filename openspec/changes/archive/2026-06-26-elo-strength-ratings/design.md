## Context

`createPoissonModel` already takes a `strengths: Map<teamId, number>` multiplier and a home-advantage factor, and is injected through the whole engine (groups, knockouts, comparison). Today nothing populates `strengths`, so every team is neutral and matches are near coin-flips. This change sources real ratings (World Football Elo), feeds them in, and makes home advantage host-only — the highest-leverage accuracy upgrade with no change to the simulation loop or downstream consumers.

## Goals / Non-Goals

**Goals:**
- A committed, id-mapped Elo `ratings.json`, produced by an offline script (no runtime third-party dependency).
- Elo → strength multiplier feeding the Poisson model; neutral fallback retained.
- Home advantage applied only to WC 2026 hosts (USA, Mexico, Canada) on home soil.

**Non-Goals:**
- Live/runtime fetching of ratings; player-level models (lineups, injuries); changing the simulation loop, bracket, scoring, or comparison.
- A new outcome-model type — we keep Poisson and only populate its inputs.

## Decisions

**1. Offline ingestion → committed `lib/data/ratings.json`.**
A `scripts/` task fetches the eloratings.net TSV, maps countries to squad ids, and writes `{ squadId: elo }`. Committed and refreshed by re-running. Rationale (over runtime fetch / `datafc` / Kaggle): reliability (no third-party on the request path), determinism (seeded sim stays reproducible), and runtime is Node/TS so a Python wrapper is a poor fit. Kaggle stays a manual cross-check only.

**2. Name → squad-id mapping with an explicit override table.**
eloratings uses country names; our squads use their own names/abbrs. Match on normalized name/abbr with a small hand-maintained override map for mismatches (e.g. "United States"→USA, "South Korea"→KOR). Ingestion **fails loudly** if any of the tournament's teams is unmapped — no partial snapshot.

**3. Elo → strength multiplier.**
Map each team to `strength = exp(K · (elo − eloRef) / 400)`, where `eloRef` is the field's mean and `K` tunes spread. This keeps the average team ≈ 1 (so overall goal rates stay realistic) while scaling stronger teams up and weaker down. `K` is a single tunable constant chosen so a large Elo gap yields a sensible scoreline edge; pinned during implementation against a couple of known matchups. (A more elaborate Elo-difference→expected-goals fit is possible later; the exponential multiplier is simple, monotonic, and sufficient.)

**4. Host-only home advantage.**
Replace the blanket `homeAdvantage` with a check: apply the boost to the fixture's home team only if it is a WC 2026 host (USA/MEX/CAN) playing in its own country. The hosts are a fixed constant. For knockout play-out (neutral venues), no home advantage unless a host is involved at home. Keeps the model honest about venue.

**5. Loader exposes ratings to the model, not the data snapshot.**
A small loader reads `ratings.json` and builds the `strengths` map; the server/provider passes it into `createPoissonModel`. The `TournamentSnapshot` shape is unchanged — ratings are a model input, not tournament data.

## Risks / Trade-offs

- **eloratings.net is undocumented (TSV could drift)** → ingestion validates shape and team coverage and refuses to overwrite a good snapshot with bad data; the committed snapshot insulates runtime entirely.
- **Mis-mapped country names** → explicit override table + fail-on-missing; a quick manual check of the 48 mapped names at ingestion time.
- **`K` mis-tuned (too flat or too extreme)** → make it a single constant, sanity-check against known matchups (e.g. a top side vs. a minnow should read lopsided but not 99%); spec fixes only the monotonic direction.
- **Stale ratings** → acceptable; Elo moves slowly and the script is cheap to re-run between match days.

## Resolved Questions

- **Source files** → `https://www.eloratings.net/World.tsv` (rank, rank, CODE, ELO, …) for current ratings + `en.teams.tsv` (CODE → names) for the name/code mapping. Plain HTTPS GET, no auth.
- **`K`** → `1` (a top side vs. a minnow reads ~75–85%, verified in-app: FRA 78% / SCO 22%, ENG 70% / ALG 30%). Single tunable constant.
- **As-of date** → yes, recorded in `ratings.json` (`asOf`, `source`).
- **Mis-map guard** → the coverage check only catches *unmapped* teams; a valid-but-wrong code (Scotland → SC = 853) slips through, so ingestion also rejects ratings outside ~[1100, 2300].
