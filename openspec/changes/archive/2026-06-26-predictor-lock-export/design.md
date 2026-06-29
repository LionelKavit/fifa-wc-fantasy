## Context

The predictor holds the user's picks (client state) and shows their evaluation. We don't host pools, so the user submits elsewhere — export is the hand-off. Day-1 scope is CSV + image (PDF deferred). The image already has a capability (`predictor-share-card`); this change is the finalize step + CSV + wiring both into one export affordance.

## Goals / Non-Goals

**Goals:**
- A user-driven finalize ("lock my picks") step that leads to export.
- CSV export (client-side) and the image card, both reflecting current picks.

**Non-Goals:**
- PDF (deferred). Server storage / accounts. Changing the tournament-kickoff lock semantics. Engine changes.

## Decisions

**1. CSV is built client-side from the picks.**
The picks are tiny (≤31 rows). A client function emits `round, match, pick` (human-readable team names, ordered R32→Final). No endpoint needed; instant download. Champion called out (e.g. a Champion row) for clarity.

**2. Finalize is a soft commit, not the tournament lock.**
"Lock my picks" here means "I'm happy — give me my export." It does not make the bracket permanently read-only (that's the tournament-kickoff lock in `bracket-prediction`). The user can edit and re-export. This matches the advisor framing (we don't host, so nothing is truly "submitted" in-app).

**3. Image reuses `predictor-share-card`.**
The export panel links to / triggers the share-card route for the current prediction; no duplicate rendering here.

**4. One export affordance.**
A single "Lock & export" control reveals both options (CSV download, image card), so the flow is fill → (chat) → lock → pick a format.

## Risks / Trade-offs

- **CSV team-name encoding** (accents, "Côte d'Ivoire") → use the snapshot's team names; quote fields properly so spreadsheets parse cleanly.
- **Incomplete bracket on export** → allow exporting a partial bracket (some pools accept that) but indicate it's incomplete; don't block.
- **Non-standard Next.js** → CSV is pure client (Blob download); the image follows `predictor-share-card`'s route per `node_modules/next/dist/docs/`.

## Open Questions

- Exact CSV columns (include the model's pick probability per row? or picks only?) — default to picks only for portability; could add an odds column. Pinned in implementation.
- Whether finalize should also snapshot the bracket into the (later) tracker — natural tie-in to Phase 5; out of scope here.
