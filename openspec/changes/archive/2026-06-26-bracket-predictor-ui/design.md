## Context

The engine is done and pure: `buildBracket`, `knockoutProbabilities`, `prediction` (model + lock), `scorePrediction`, `compareToModel`. The existing app is a thin Next.js shell over the engine with a cached tournament-data provider and `/api/groups` routes, plus a Scout chat. This change adds the predictor surface: a bracket UI, local persistence of picks, and the two API endpoints that feed it. The Monte Carlo is far too heavy for the browser, so all simulation stays server-side.

## Goals / Non-Goals

**Goals:**
- An interactive, fill-in bracket tree driven by the `bracket-prediction` model.
- Local-first persistence (no account) keyed to the locked bracket.
- Live scoring + the headline survival % + contrarian score + divergence + inline upset flags.
- Server-side endpoints: bracket (+ baseline odds) and prediction evaluation.

**Non-Goals:**
- Share-card image generation (separate Phase-E change).
- Scout narration of the bracket (separate Phase-E change).
- Multi-fan leaderboards / accounts.
- Any change to engine behaviour.

## Decisions

**1. Picks live client-side; all simulation lives server-side.**
The client holds the lightweight `Prediction` (matchId → teamId) and persists it; it posts the picks to the evaluation endpoint to get scoring + comparison. This keeps the browser responsive and the 50k-trial Monte Carlo on the server. The client never imports the simulation.

**2. Two endpoints, both via the cached provider.**
`GET bracket` → bracket structure + baseline (pre-knockout) per-team odds (snapshot-only, cacheable, shared across all fans). `POST evaluate` → scoring + comparison for a specific prediction. The baseline odds are reused by every evaluation, so only the prediction-specific survival/live pass varies per request. Reuses the existing short-TTL cached-provider pattern; live-awareness already shortens the TTL during matches.

**3. Persist picks in `localStorage`, keyed to a bracket identity.**
Store `Prediction` as `matchId → teamId`, under a key derived from the bracket's identity (e.g. the set of R32 participants) so a stored bracket is discarded/migrated cleanly if the real R32 changes. No account, no server write. The locked R32 is stable, so the key is stable once the bracket sets.

**4. Bracket-tree component renders from the engine's `Bracket`; interaction calls the prediction helpers.**
The tree renders matches by round; clicking a slot calls `pick(...)` (client-side, pure) to update the local `Prediction`, then re-renders and (debounced) re-evaluates. Lock state from the server (or derived from the bracket payload) flips the UI to read-only. Reuses existing component/styling conventions (flags, team buttons) and original styling only.

**5. Upset flags come from the comparison/odds payload, not recomputed in the client.**
A match is flagged when the favourite's win probability is below a threshold (from `knockout-probability` matchup/odds data included in the evaluation or bracket payload). Threshold is a presentation constant.

## Risks / Trade-offs

- **Evaluation latency (two simulations per request)** → reuse the cached snapshot-only baseline across requests; allow a modest default trial count for the interactive path (higher only for a final/share computation); debounce client re-evaluation while the fan is still editing.
- **Non-standard Next.js** → must follow `node_modules/next/dist/docs/` before writing routes/components; do not assume stock App Router behaviour.
- **localStorage drift if the real R32 changes** → key the stored prediction to the R32 identity and discard on mismatch, so a stale bracket can't mis-render.
- **Placeholder rounds before lock** → later-round slots show predicted-winner labels (from the prediction) or "Winner of …" placeholders until picks/real results resolve them; the prediction model already supplies this.

## Open Questions

- Exact route path (`/predictor`) and whether it's linked from the main dashboard — a product/navigation choice; default to a dedicated route linked from the dashboard.
- Default trial count for the interactive evaluation vs. a higher-fidelity pass for the final/share number — pinned in implementation against measured latency.
- Upset-flag probability threshold — a presentation constant; pinned with design review.
