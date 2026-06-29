## Why

The generator picks upsets by `roundWeight × multiplier × pUnderdog`, where `roundWeight` doubles each round (1/2/4/8/16) and `pUnderdog` is a *single-match conditional* probability that never compounds. Two problems fall out: (1) it sends far-fetched underdogs deep — a weak team can get chained to the final — because depth wins on round weight alone, ignoring that the underdog must survive every prior round; (2) it over-fits to *our* scoring scheme, undervaluing the plausible early-round upsets that many real pools (often with seed/upset bonuses) reward heavily. Brackets should look realistic and differentiate well across pool types, not stat-pad against our specific points.

## What Changes

- Replace the upset-**selection** value with an **expected-differentiation** value that is robust to the pool's scoring scheme:
  - **Plausibility** — weight by the *compounded* probability the upset actually comes true: the underdog's marginal probability of winning that match in reality (i.e. reaching the next stage), from the engine's existing per-team reach odds. This shrinks fast with depth, so a deep upset is only valued if the team realistically could get there.
  - **Differentiation** — times how contrarian the pick is versus the chalk-biased field (favor picks the field is unlikely to have), estimated from the matchup probabilities + the public chalk bias the generator already uses.
  - **Remove our doubling round-scoring weights (1/2/4/8/16) from the selection** so the generator no longer optimizes for our specific point values. Depth influences selection only through the (lower) probability of deep upsets and the (higher) contrarianness — not through our scoring numbers. Those weights remain ONLY for the verdict card's displayed score (unchanged).
- **Net effect**: weak teams are no longer chained to the final; the generator prefers plausible early/mid-round upsets, taking a deeper upset only when a team realistically could reach it — producing brackets that look real and differentiate across a range of pool schemes.
- **Unchanged**: the boldness budget from risk + pool size; favor/fade expert signals still bias selection; the seeded jitter behind Regenerate variety; feasibility and determinism; the multiplier band still used only to *qualify* a candidate as a real upset (not to weight it).

## Capabilities

### Modified Capabilities
- `bracket-generator`: change how upsets are valued for selection — from round-points × conditional probability to plausibility (compounded reach probability) × differentiation (contrarian vs. the chalk field), with our scoring weights removed from the selection.

## Impact

- **Engine** (`lib/engine/bracketGenerator.ts`): the generator gains a per-team marginal stage-win-probability input and computes selection value from compounded plausibility × contrarianness instead of `roundWeight × multiplier × pUnderdog`. Still pure; probabilities are a deterministic input. `DEFAULT_STAGE_WEIGHTS` is no longer referenced in selection (it stays in `predictionScore` for scoring).
- **Server** (`lib/server/predictor.ts#generatePrediction`): supply the marginal reach probabilities from `knockoutProbabilities` (already computed for champion odds via `getBracketData`).
- **No change** to the scoring scheme (`bracket-prediction-scoring`), the verdict card, the pool-finish sim, or the favor/fade + seed inputs.
- Deferred (noted): leverage-driven selection (Phase-2 sim) and configurable pool scoring (user enters their pool's real rules) — the proper long-term fix for "every pool scores differently".
