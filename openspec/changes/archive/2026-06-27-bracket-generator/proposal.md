## Why

Filling 31 knockout matches by hand is the taxing part — casual fans agonize, copy a friend, or give up. The app is the expert friend; it should offer to *fill the bracket for them*. With Phases 1–3 in place (grounded scoring, pool-finish odds, the verdict card), Phase 4 adds the headline pain-killer: a **risk-calibrated, one-click bracket generator** that produces a complete, grounded starting point the user can then tweak.

## What Changes

- **Engine generator** (pure, seeded): given the bracket, the Elo model, a **risk level** (`safe` / `balanced` / `bold`), a **pool size**, and a seed, produce a **complete, feasible** prediction.
  - Start from **chalk** (the Elo favorite at every match). Introduce a **boldness budget** of upsets whose size scales with the risk level *and* pool size — bolder/bigger pools take more and deeper upsets (including a non-favorite champion at `bold`); `safe` is essentially chalk.
  - Spend the budget on the highest-**value** upsets, where value = round weight × upset multiplier × the underdog's win probability (the Phase 1 scheme), restricted to real underdogs (multiplier ≥ 2). Build top-down so the result stays feasible. Deterministic given the seed.
- **Risk recommendation** (pure): pool size → a recommended risk level with a one-line rationale (small pools usually win on chalk; larger pools need differentiation → bolder).
- **API**: `POST /api/predictor/generate { poolSize, risk }` → the generated picks (`[matchId, teamId][]`), server-side, reusing the existing predictor helpers.
- **Build box** (the verdict card's incomplete state): the pool-size input plus a **risk slider** (Safe ↔ Balanced ↔ Bold) with the recommendation surfaced, and a **"Build my bracket for me"** button. Generate → **populate** the bracket (every pick editable in the tree) → it re-scores → once complete, the Phase 3 verdict card shows. The generated bracket is a **starting point**, not a locked result. If the user already has picks, confirm before overwriting.

## Capabilities

### New Capabilities
- `bracket-generator`: the grounded, deterministic bracket generator (risk + pool size → a complete feasible bracket via a value-ranked boldness budget), the pool-size → risk recommendation, and the `generate` endpoint.

### Modified Capabilities
- `bracket-verdict-card`: the incomplete-state prompt becomes the **Build box** (pool size + risk slider + recommendation + Generate); generating populates an editable bracket that then flows into the verdict.

## Impact

- **Engine** (new `lib/engine/bracketGenerator.ts` + `lib/engine/index.ts` export): pure generator + recommendation, reusing `buildBracket`, the bracket layout, the Phase 1 weights/`upsetMultiplier`, and an injected head-to-head probability; seeded via `mulberry32`; unit-tested.
- **Server** (`lib/server/predictor.ts`): a `generateBracket(poolSize, risk)` helper wiring the Elo `eloHeadToHead` + projection into the engine.
- **API** (`app/api/predictor/generate/route.ts`): new POST route.
- **UI** (`app/components/BracketVerdict.tsx` + `BracketPredictor.tsx`): risk slider + recommendation + Generate in the incomplete state; an `onGenerate(picks)` callback that sets the predictor's picks (populating + persisting), with an overwrite confirm.
- **No** LLM (Phase 5), external data (Phase 6), or regenerate-in-place / personas / leverage UI (Phase 7).
