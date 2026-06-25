## Why

Fans watching the group stage constantly ask "what does my team need to go through?" — and the official app only shows a table, not the answer. The deterministic core answers the part that is pure math: from the live snapshot, compute each group's standings under FIFA tiebreakers and classify every team as **clinched / eliminated / still alive**, including the exact results that would secure or end their top-2 hopes. This is the foundation the probabilistic layer and the LLM build on, and it is exactly relevant during the live group stage.

## What Changes

- Add group-standings computation from completed group fixtures, applying FIFA WC group ranking criteria (points → goal difference → goals scored → head-to-head among tied teams → fair play → lots) with deterministic ordering.
- Add a per-team qualification verdict for the top-2 places within a group: `clinched` (advances regardless of remaining results), `eliminated` (cannot reach top 2), or `alive` (depends on results).
- For `alive` teams, enumerate the remaining group fixtures and report the minimal result each team needs to guarantee top 2, and the result(s) that would eliminate them.
- Mark teams whose only remaining path is a third-place finish, and hand that case off to the probabilistic layer (this change does NOT decide cross-group third-place outcomes).
- Handle live (in-progress) fixtures explicitly: standings computed on completed results, with an option to fold a live scoreline into a provisional view.

## Capabilities

### New Capabilities

- `group-standings` — compute ordered group tables from the snapshot under FIFA WC tiebreaker rules.
- `qualification-verdict` — classify each team's top-2 fate (clinched/eliminated/alive) and, for alive teams, the results that secure or end qualification.

### Modified Capabilities

None.

## Impact

- New code under `lib/engine/` (e.g. `standings.ts`, `verdict.ts`), pure functions consuming `TournamentSnapshot` from the `data-ingestion` capability.
- Depends on the `data-ingestion-layer` change; adds no new data fetching.
- Output consumed by the `probabilistic-scenario-engine` change (top-2 verdicts and identified third-place cases) and later by the LLM/UI.
- No new runtime dependencies.
