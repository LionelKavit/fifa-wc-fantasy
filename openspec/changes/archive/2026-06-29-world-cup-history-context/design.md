## Context

The Scout (Analyst) is a tool-use loop with a frozen, cached system prompt and engine-backed tools (`lib/scout/tools.ts`) that return grounded facts; it never invents numbers. There is no World Cup history in the system today. The RSSSF "full" pages (1930–2018) are rich, consistent preformatted text — per match: date, venue, attendance, referee, lineups, subs, cards, **goalscorers with minutes** — plus group standings, a top-scorer summary, and a records section. `2022f.html` is the sparse exception (scores + standings + tournament top scorer; per-match scorers only for the final). History is fixed, so it can be parsed once and committed.

## Goals / Non-Goals

**Goals:**
- A committed, trusted World Cup history dataset (1930–2022) and a few Scout tools that surface it as compact grounded facts.
- Robust, high-value extraction: results, standings, champions, top scorers → derived team records, head-to-head, all-time scorers.
- Strictly Analyst context: no model/scoring/UI change; history never influences WC2026 odds.

**Non-Goals:**
- Lineups, subs, cards, referees, attendance, minute-level per-match scorers (brittle, low value, missing for 2022).
- Runtime fetching of RSSSF (parse offline, commit the result).
- Feeding history into the probability model (Part B is out).

## Decisions

**1. One-time offline parse → committed JSON.** A dev script (`scripts/ingest-wc-history.ts`) fetches/reads the 22 pages and emits `lib/data/world-cup-history.json`, committed to the repo. Runtime never fetches RSSSF. The file records provenance (`source`, `generatedAt`) and RSSSF attribution. Re-running the script is a manual maintenance step, not part of the app.

**2. Store raw tournaments; derive aggregates at load.** The committed file holds per-tournament facts only:
```
tournaments: [{ year, host, final: {winner, runnerUp, score}, podium?, topScorers: [{player, team, goals}],
                matches: [{ date?, stage: "group"|"R16"|"QF"|"SF"|"final"|"third", teams: [abbrOrName, …], score: [n,n], aet?, pens? }] }]
```
Per-team **records**, the **head-to-head index**, and **all-time scorer tallies** are computed from this by pure functions, cached server-side. Single source of truth = the tournaments; aggregates are derived and testable.

**3. Robustness over completeness.** The parser targets the reliably-structured bits (match result lines, standings blocks, top-scorer summaries). Where a page is sparse (2022f) it contributes results + standings + the tournament top scorer; all-time scorer tallies are therefore "based on each tournament's scorer summary" (full for the rich pages, top-only for 2022). This limitation is documented in the dataset and surfaced honestly by the tools.

**4. Historical nation identity.** Team names are stored as the source records them (e.g. "West Germany", "Soviet Union", "Yugoslavia", "Czechoslovakia"). A small, documented **alias map** merges only the widely-accepted successor — **West Germany → Germany** — so a query for Germany includes the 1954/74/90 titles. Other historical entities (East Germany, Soviet Union, Yugoslavia, Czechoslovakia, Serbia & Montenegro) are kept **distinct and labelled**; the tools note when a record spans a predecessor name rather than silently merging.

**5. Tools (compact, grounded).** A tight set on top of the loader:
- `get_wc_record(team)` → appearances, titles, finals/semis reached, W-D-L, GF/GA, best finish.
- `get_wc_head_to_head(a, b)` → count + each WC meeting (year, stage, score).
- `get_wc_top_scorers(year?)` → that tournament's Golden Boot list, or all-time tallies when no year.
- `get_wc_champions()` → champions by year (+ title counts).

They reuse the existing forgiving name resolution and "grounded facts only" conventions. Outputs are compact summaries, not raw dumps.

**6. Persona/grounding.** A brief system-prompt line: the Analyst may answer World Cup *history* questions using these tools (use the tool, don't guess), as qualitative color — and it MUST NOT use history to produce or change WC2026 probabilities, which still come from the odds tools. History and the current model are disjoint domains.

## Risks / Trade-offs

- **Parsing brittleness.** Preformatted text drifting across eras (2-digit vs 4-digit years, accents/encoding, `aet`/pens, `p`/`o`/`h` annotations). Mitigated by targeting only the robust fields and validating the committed output (counts: 22 tournaments, plausible champions/match totals). It's a one-time offline cost, not a runtime risk.
- **2022 sparsity.** Per-match scorers and full scorer lists are missing for 2022; the tools surface what exists and say so.
- **Nation identity is opinionated.** The West-Germany→Germany merge (and keeping others separate) is a judgement; documented and transparent in tool output.
- **Marginal decision value.** History is color/credibility, not pick guidance — intentionally scoped small (one dataset + ~4 tools), kept proportionate.
- **Staleness after WC2026.** When 2026 finishes it could be appended later by re-running the script; out of scope now.
