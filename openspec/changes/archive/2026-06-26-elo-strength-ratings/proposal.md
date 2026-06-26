## Why

The prediction engine is sound — Poisson sampling, FIFA tiebreakers, Annex C, knockout play-out — but its `strength` input is **neutral for every team**, so the only asymmetry is a blanket home-advantage term. That makes every match a near coin-flip (Argentina vs. Cape Verde reads ~54/46), flags every game as an "upset watch," and gives the predictions no real edge. Feeding in real team-strength ratings is the single highest-leverage upgrade, and the model is already built to accept them.

## What Changes

- Add a **team strength ratings source**: an offline ingestion script that fetches World Football Elo ratings (eloratings.net), maps each country to our squad id, and writes a **committed `ratings.json`** snapshot. Refreshed by re-running the script; not fetched at runtime.
- Derive per-team **strength multipliers from Elo** and feed them into the Poisson outcome model, so stronger teams have higher scoring rates and matchups reflect real disparities. The neutral baseline remains the fallback when no rating is available.
- Apply **home advantage only to host nations on home soil** (USA / Mexico / Canada), since WC 2026 is hosted there and all other matches are effectively neutral — replacing the blanket home-advantage boost.

## Capabilities

### New Capabilities
<!-- None; extends existing capabilities. -->

### Modified Capabilities
- `data-ingestion`: add team strength ratings ingestion — an offline fetch of Elo ratings, mapped to squad ids and validated (all 48 teams covered), persisted as a committed snapshot the engine reads.
- `advancement-probability`: the Poisson outcome model SHALL derive per-team strength from the ratings when available (neutral fallback retained), and SHALL apply home advantage only to host nations playing at home.

## Impact

- **New**: an ingestion script under `scripts/` and a committed `lib/data/ratings.json` (squad id → Elo). A small loader exposes the ratings to the engine; `createPoissonModel` is given a `strengths` map derived from them.
- **Engine**: `lib/engine/outcome.ts` strength derivation (Elo → multiplier) and host-only home advantage. No change to the simulation loop, the bracket, scoring, or comparison — all consume the model unchanged, so every downstream probability sharpens automatically.
- **Data**: eloratings.net is an undocumented third-party TSV; ingestion validates and fails loudly on missing teams or shape drift, consistent with the existing data-layer posture. The committed snapshot keeps runtime free of a third-party dependency and keeps the seeded simulation reproducible.
- **No** API/UI changes and no change to public engine interfaces; the upgrade is data + the model's internal strength derivation.
