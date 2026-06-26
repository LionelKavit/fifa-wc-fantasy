## Why

The whole engine stops at the group stage: it computes standings, verdicts, third-place ranking, and advancement probabilities, but it has no representation of the knockout tree those teams advance *into*. Every planned next feature — deep-run odds, the bracket Predictor game, path-to-the-final views — needs the bracket to exist as data first. This change builds that foundation: the FIFA World Cup 2026 knockout tree, correctly seeded, including the part no scoreboard shows correctly — how the 8 best third-placed teams slot into the Round of 32.

## What Changes

- Introduce a knockout-bracket model: the fixed single-elimination tree for WC 2026 — Round of 32 → Round of 16 → Quarterfinals → Semifinals → Final — as pure, framework-agnostic TypeScript over the existing `TournamentSnapshot`.
- Define every knockout match as a slot with two **feeders**, each feeder being either a finished-round source (winner of an earlier knockout match) or a group-stage source (a group's winner/runner-up, or one of the 8 qualifying third-placed teams).
- Map group winners and runners-up into their Round of 32 slots per the official 2026 seeding layout.
- Carry, for each of the 8 third-placed Round-of-32 slots, the candidate group letters that may fill it (per FIFA's published candidate sets), and resolve each to a concrete team grounded in the snapshot's own Round-of-32 fixtures. Self-computing the assignment from FIFA's 495-row Annex C table (needed only for snapshots without an authoritative assignment, e.g. simulated ones) is deferred to a later change.
- Represent not-yet-determined slots as **placeholders** (e.g. "Winner Group F", "Runner-up Group C", "3rd C/E/F/H") so the bracket renders meaningfully before groups finalize and progressively resolves to concrete teams.
- Expose bracket construction as a pure function, consistent with the rest of the engine, so it is fully testable and reusable inside later probability/simulation work.

This change is **structure only**: no probabilities, no simulation, no UI, no API. Those are deliberately deferred to later changes that build on this model.

## Capabilities

### New Capabilities
- `knockout-bracket`: the data model and pure construction of the WC 2026 knockout tree — tree shape, match slots and feeders, official R32 seeding of group winners/runners-up, FIFA lookup-table assignment of the 8 best third-placed teams, and placeholder representation of undetermined slots.

### Modified Capabilities
<!-- None. This change only reads from existing capabilities (third-place-ranking, group-standings); it does not alter their requirements. -->

## Impact

- **New engine module** under `lib/engine/` (e.g. `bracket.ts`) plus tests; pure functions over `TournamentSnapshot`, no UI/Next.js coupling.
- **Reads from** existing capabilities `third-place-ranking` (the qualifying 8 and their group letters) and `group-standings` (each group's ordered top two). No changes to those modules or their specs.
- **Data**: relies only on the already-ingested snapshot (`squads.json` for teams/groups, `rounds.json` which already embeds the R32/R16/QF/SF/F rounds and fixtures). No new data source.
- **No** API routes, components, dependencies, or breaking changes. Establishes the contract that later changes (`knockout-probability`, `bracket-prediction`, predictor UI) depend on.
