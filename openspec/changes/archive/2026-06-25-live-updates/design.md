## Context

The app reflects results only at full-time. Three gaps cause this (verified in code): grounding calls `computeGroupStandings` without the provisional flag (completed-only); the verdict/simulation treat a live match as an unplayed remaining fixture; and nothing pushes updates to the client. The building blocks already exist — a `live` fixture status in the data model, a `provisional` standings mode that folds an in-progress score, and a short-TTL server cache — so this change is mostly wiring plus one modeling addition (live-conditioned simulation).

## Goals / Non-Goals

**Goals:**
- During a match, the standings, statuses, probabilities, and narration move as goals go in.
- The dashboard updates itself during live windows and clearly marks live games.
- Stay within a bounded upstream fetch rate; behave exactly as today when nothing is live.

**Non-Goals:**
- No new data source or paid feed; uses the existing FIFA endpoints.
- No minute-accurate match simulation engine — a reasonable live-conditioning model is enough.
- No websocket infrastructure if polling suffices (SSE is an optional upgrade).
- No change to the keyless Scout fallback or auth model.

## Decisions

- **Reuse provisional standings; add a live mode to grounding.** `buildGroupSituation`/`buildTeamSituation` gain a `live` option that calls `computeGroupStandings(..., { provisional: true })` and marks live fixtures + current scores. Completed-only remains the default for non-live contexts. Alternative: always provisional — rejected, would mislead when nothing is live.
- **Live-aware cache cadence, not no cache.** The provider detects whether any fixture is live; if so it uses a short TTL (e.g. ~10–15s) and otherwise the normal 60s. The cache still sits in front of the feed so upstream is fetched at a bounded rate regardless of client count. Alternative: bypass cache during live — rejected, would hammer the feed under load.
- **Live-conditioned simulation: sample only the remaining goals.** For an in-progress match, the trial starts from the current scoreline and samples *additional* goals for the rest of the match, rather than from 0–0. The remaining-goal expectation scales the Poisson rate by the fraction of the match left, using the feed's minute/period where available; if minutes are unavailable, fall back to a conservative fixed fraction (e.g. treat the live score as a partial result with a modest remaining-goal allowance). The clinched/eliminated deterministic pins still apply. This keeps the existing Monte Carlo loop and only changes how a live fixture's scoreline is seeded. Alternative: treat live score as final — rejected, overstates certainty mid-match.
- **Client refresh via polling, gated on live state.** The dashboard reads the API's live indicator; when something is live it polls on an interval matched to the live cadence and re-renders in place; when nothing is live it does not poll. SSE is a possible later upgrade if polling proves insufficient. Alternative: always poll — rejected, needless load when idle.
- **In-place updates.** Refreshes replace data without remounting the page, so scroll position and the Scout chat (client state) are preserved.

## Risks / Trade-offs

- **Partial-match model accuracy** → the live-conditioning is an approximation; document it, keep it behind the injectable outcome model, and treat probabilities as indicative. Tests assert monotonicity (a current lead never lowers a team's odds) rather than exact values.
- **Upstream rate during live** → bounded by the server cache + live TTL, independent of client count; tune the live TTL if needed.
- **Probability jitter as scores change** → intended and should be presented as live movement, not smoothed away; the UI marks data as live/provisional.
- **Feed may not populate live scores/minutes reliably** → degrade gracefully: if a fixture is flagged live but carries no score yet, treat as 0–0 in progress; if minutes are missing, use the fallback fraction.
- **Over-refreshing the UI** → gate polling on live state and update in place.

## Migration Plan

Additive on top of the current app. Add live detection + live TTL to the provider; a `live` mode to grounding; live-conditioned seeding to the simulation; a live indicator to the data API; and gated polling + live badges to the dashboard. Verify with unit tests (live-folded standings, live-conditioned monotonicity, cadence selection) and a manual live-window check (or a synthetic snapshot with an in-progress fixture).

## Open Questions

- Exact live TTL and poll interval — pick against feed behavior during a real match; start ~10–15s.
- Exact remaining-goal model (minute-scaled Poisson vs. fixed allowance) — decide at implementation; keep it injectable.
- Polling vs SSE — start with polling; revisit if the live cadence makes polling wasteful.
- Whether the Scout's answers should also switch to the live view during matches — likely yes (reuse the same live grounding), to confirm at implementation.
