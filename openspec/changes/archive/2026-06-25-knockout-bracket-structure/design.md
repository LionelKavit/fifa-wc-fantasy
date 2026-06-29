## Context

The engine today ends at the group stage: `group-standings` orders each group, `qualification-verdict` decides clinched/alive/eliminated, `third-place-ranking` selects the best 8 of 12, and `advancement-probability` estimates who reaches the Round of 32. Nothing models the knockout tree those teams advance into. The snapshot already carries everything we need: `Stage = GROUP|R32|R16|QF|SF|F`, and `rounds.json` embeds R32/R16/QF/SF/F fixtures with `home/awaySquadId` (1–48 space) and scores — those slots fill with concrete teams as the tournament progresses.

This change adds a pure engine module that builds the bracket as structured data. It is the foundation for later changes (`knockout-probability`, `bracket-prediction`, predictor UI). It introduces no probabilities, no UI, no API.

## Goals / Non-Goals

**Goals:**
- A pure `buildBracket(snapshot)` function returning the full R32→Final tree.
- Correct official 2026 seeding of the 12 group winners/runners-up into R32.
- Correct FIFA lookup-table assignment of the 8 best third-placed teams, keyed by which group letters qualify.
- Graceful placeholders for undetermined slots, resolving progressively as results land.
- Reuse of existing `group-standings` and `third-place-ranking` outputs; no duplicated logic.

**Non-Goals:**
- Any probability/simulation (deferred to `knockout-probability`).
- A third-place playoff match (SF losers): not present in the snapshot's rounds and out of scope; the tree terminates at the Final.
- UI, API routes, persistence, prediction, or scoring.
- Re-deriving knockout *results* from scratch — completed knockout fixtures already carry scores in the snapshot; we read winners from there.

## Decisions

**1. Bracket is derived structure, not stored.**
`buildBracket(snapshot)` is a pure function recomputed on demand, matching the rest of the engine (no persistence). Alternative — caching a materialized bracket — adds invalidation complexity for no benefit while data drifts live. Rejected.

**2. Slot occupancy is modeled as a discriminated `Feeder`, separate from any resolved team.**
Each slot has a `feeder` (where the participant comes from) and an optional resolved `team`. Feeder kinds: `groupSource` (group + position winner/runner-up), `thirdPlaceSource` (the slot's lookup assignment / candidate group-set), `matchWinnerSource` (predecessor match id). This keeps "structure" (always knowable) cleanly separate from "resolution" (knowable only as results arrive), which is exactly what placeholders vs. concrete teams require. Alternative — only storing teams and using null for unknown — loses the human-readable "Winner Group F" / "3rd C/E/F/H" labels the UI needs. Rejected.

**3. Two static lookup tables, transcribed from the official 2026 layout.**
(a) The R32 winner/runner-up pairing layout, and (b) the third-placed allocation table mapping each *combination* of 8 qualifying group letters → which slot each third-placed team fills. These are constants in the engine module, unit-tested against the published bracket. The third-placed table is the genuinely hard, uniquely-correct piece; encoding it as data (not branching logic) keeps it auditable. Alternative — deriving the allocation algorithmically — is error-prone and not how FIFA defines it (it's a published table). Rejected.

**4. Resolution reads from existing capabilities + snapshot, in layers.**
Group winners/runners-up come from `group-standings` (only when a group is final). The 8 third-placed qualifiers and their group letters come from `third-place-ranking`. Knockout match winners come from completed `R32+` fixtures already in the snapshot. Each layer that is not yet decided leaves placeholders; nothing is invented.

**5. Determinism inherited from upstream.**
Bracket construction adds no randomness; any tie resolution is already handled deterministically by `group-standings`/`third-place-ranking`. Identical snapshot ⇒ identical bracket.

## Risks / Trade-offs

- **The third-placed allocation table is easy to mis-transcribe** → encode it as an explicit constant and add unit tests covering multiple qualifying-letter combinations, including at least one verified against FIFA's published example.
- **Official seeding layout could differ from assumptions / FIFA could amend it** → isolate both tables as named constants with a single source-of-truth comment citing the layout, so a correction is a one-line data edit, not logic surgery.
- **Snapshot shape drift in knockout fixtures (undocumented endpoints)** → rely only on already-validated fields (`stage`, `home/awaySquadId`, scores, status) surfaced by the existing data layer; do not parse raw JSON here.
- **Partial/ambiguous mid-tournament states** (e.g. group final but third-placed set incomplete) → placeholder model explicitly supports per-slot partial resolution, so the bracket is always renderable.

## Open Questions

- Confirm the exact published 2026 third-placed allocation table source to transcribe (FIFA's official bracket). To be pinned during implementation of the constant; does not affect the spec or these interfaces.
- Whether later changes will want a third-place playoff node; currently excluded as it is absent from the snapshot rounds.
