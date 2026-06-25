## Why

The engine emits correct but raw outputs — standings rows, verdict enums, advancement floats. Before an LLM can explain them (or a UI render them), they need to be assembled into a coherent, per-team/per-group "situation" and narrated in plain English. Doing this as a deterministic, pure layer — with no LLM — means every fact the Scout later cites is grounded in tested code, not generated, so the agent can never invent a probability or misstate what a team needs. It is also fully testable without an API key.

## What Changes

- Add a situation-assembly layer that joins the deterministic verdict (Layer 1) and advancement probability (Layer 2) for a team or group into one structured `TeamSituation` / `GroupSituation` object: current position, top-2/advancement status, what the team needs, advancement probability and its conditional split, rivals, and the decisive remaining fixtures.
- Add deterministic plain-English narration: templated one-to-three sentence summaries ("Mexico have already secured a top-2 place"; "Sweden go through with a win, and likely even on a draw via the best-third-placed places") derived purely from the structured situation — no LLM.
- Expose a single `buildGroupSituation(snapshot, groupId)` / `buildTeamSituation(snapshot, teamId)` accessor returning structured facts plus their narration, suitable both as LLM grounding context and as a non-LLM fallback explainer.
- Keep it pure and snapshot-driven; advancement probabilities are included when a simulation is supplied, and omitted (verdict-only) otherwise so callers control simulation cost.

## Capabilities

### New Capabilities

- `scenario-grounding` — assemble engine outputs into structured per-team/per-group situations and deterministic plain-English narration for LLM grounding and UI.

### Modified Capabilities

None.

## Impact

- New code under `lib/grounding/`, pure functions consuming `TournamentSnapshot` plus engine outputs (`computeGroupStandings`, `computeQualificationVerdicts`, `advancementProbabilities`).
- Depends on `data-ingestion-layer`, `deterministic-scenario-engine`, and `probabilistic-scenario-engine`; adds no new data fetching and no LLM.
- Consumed by the `scout-agent` change (as tool return values / grounding context) and later by the UI.
- No new runtime dependencies.
