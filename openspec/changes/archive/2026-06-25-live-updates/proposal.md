## Why

Today the app only reflects results at full-time: the server caches the snapshot + advancement report for 60s, the grounding/API read completed matches only, and the dashboard never refreshes itself. So while a match is being played, the scenarios sit still — a goal that swings a group changes nothing on screen until the match ends. Fans want the opposite: the picture should move *as it happens*. The foundations are already in place (a `live` fixture status, a provisional standings mode that folds an in-progress score, a short-TTL fetch); this change wires them end-to-end.

## What Changes

- **Detect live matches** from the feed and, during live windows, refresh the underlying data on a much shorter cadence so in-progress scores flow through quickly (and fall back to the normal cadence when nothing is live, to avoid needless churn and endpoint load).
- **Live-aware standings & situations:** when a fixture is in progress, fold its current scoreline into the group table (provisional), mark the table and the affected fixtures as live, and narrate the live state ("Sweden are currently beating Japan, which as it stands puts them through").
- **Live-conditioned probabilities:** in-progress matches are simulated *starting from their current scoreline* rather than 0–0, so a team currently leading sees its advancement odds reflect that lead (modeling approach in design.md).
- **Auto-refreshing dashboard:** during live windows the dashboard updates itself (polling, with SSE as a possible upgrade) and surfaces live-match indicators (which games are in progress, current score). When no matches are live, it does not poll.
- Keep the server the trust boundary and the endpoints un-hammered: refresh is still server-cached, just on a shorter live cadence.

## Capabilities

### New Capabilities

- `live-tournament-state` — server: detect live matches, refresh fast during live windows, and expose live-aware (provisional) standings, situations, and live-conditioned probabilities.
- `live-dashboard-refresh` — client: auto-refresh the dashboard during live windows and surface live-match indicators.

### Modified Capabilities

None (additive; reuses the existing provisional-standings mode and `live` fixture status).

## Impact

- Touches `lib/server/` (live-aware cache cadence + live detection), `lib/grounding/` (live-mode situations), `lib/engine/` (live-conditioned simulation start-from-current-score), `app/api/` (expose live state; optional SSE), and `app/components/` (auto-refresh + live indicators).
- No new external data source; uses the existing FIFA feed and the built provisional/`live` plumbing.
- Depends on all current changes (data → engine → grounding → scout → web-api → web-ui).
- Probabilities will visibly jitter as live scores change — that is the intended behavior, not noise.
