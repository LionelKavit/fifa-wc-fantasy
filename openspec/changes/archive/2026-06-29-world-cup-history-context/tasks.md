## 1. Offline ingestion → committed dataset

- [x] 1.1 Write a one-time dev script (e.g. `scripts/ingest-wc-history.ts`) that reads the 22 RSSSF full pages (1930–2018 `*full.html`, plus `2022f.html`) and emits `lib/data/world-cup-history.json`. Tolerate per-era format drift; parse only the robust fields (match result lines, group standings, top-scorer summaries, host/champion/final).
- [x] 1.2 Shape per tournament: `{ year, host, final: { winner, runnerUp, score }, topScorers: [{ player, team, goals }], matches: [{ date?, stage, teams, score, aet?, pens? }], standings? }`. Record provenance (`source`, `generatedAt`) and RSSSF attribution in the file.
- [x] 1.3 Run the script and **commit** `world-cup-history.json`. Validate the output: 22 tournaments, plausible champions/match counts, no obviously broken rows. (Re-running is a manual maintenance step; runtime never fetches.)

## 2. Loader + derived aggregates (engine/server, pure + tested)

- [x] 2.1 Add a loader for the committed dataset (cached) in `lib/engine` or `lib/server`.
- [x] 2.2 Pure aggregation functions: per-nation all-time record (appearances, titles, finals/semis reached, W-D-L, GF/GA, best finish); a head-to-head index (meetings by year/stage/score); all-time top-scorer tallies (sum of per-tournament scorer summaries).
- [x] 2.3 Nation alias map: merge **West Germany → Germany**; keep other historical names distinct; label records that span a predecessor name.

## 3. Scout tools + persona

- [x] 3.1 In `lib/scout/tools.ts`, add history tools: `get_wc_record(team)`, `get_wc_head_to_head(a, b)`, `get_wc_top_scorers(year?)`, `get_wc_champions()` — compact grounded outputs, reusing forgiving name resolution; report absence honestly.
- [x] 3.2 In `lib/scout/prompt.ts`, add a brief line: the Analyst may answer World Cup *history* questions using these tools (use the tool, don't guess), as color — and never uses history to produce/alter WC2026 odds, finishes, or picks.

## 4. Tests

- [x] 4.1 Aggregation (pure, on a small fixture dataset): team record totals (appearances/titles/W-D-L/GF-GA/best finish) are correct; head-to-head returns the right meetings; all-time scorer tallies sum per-tournament summaries; West Germany merges into Germany while another former nation stays distinct.
- [x] 4.2 Tools (keyless/deterministic): each history tool returns grounded facts for a known query and reports absence (no fabrication) for an unknown one; a malformed/unknown team resolves forgivingly or returns "no data".
- [x] 4.3 Dataset sanity test: the committed `world-cup-history.json` loads, has 22 tournaments, and each has a champion and at least one match.

## 5. Verify

- [x] 5.1 Verify in preview (chat): ask the Analyst a few history questions (a nation's WC record, a head-to-head e.g. "Argentina vs Germany at the World Cup", "who won in 1986", "top scorers in 2018") — answers are grounded in the tools and correct. Ask a WC2026 odds/pick question and confirm the numbers still come from the engine tools (history not used for figures). No console/server errors.

## 6. Spec sync

- [x] 6.1 Confirm the implementation matches the ADDED requirements in `specs/world-cup-history/spec.md` and `specs/scout-tools/spec.md`; keep code and specs in sync.
