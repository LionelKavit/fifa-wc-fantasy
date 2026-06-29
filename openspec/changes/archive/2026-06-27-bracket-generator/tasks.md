## 1. Engine generator

- [x] 1.1 Add `lib/engine/bracketGenerator.ts` with a `RiskLevel = "safe" | "balanced" | "bold"` and a pure `generateBracket({ bracket | snapshot+projection, matchupWinProb, risk, poolSize, seed })` returning a complete `Prediction`.
- [x] 1.2 Pass 1 — build the chalk bracket (Elo favorite at every match) top-down, recording each match's participants.
- [x] 1.3 Score each match's upset value = `roundWeight × upsetMultiplier(p_underdog) × p_underdog`, counting only real underdogs (multiplier ≥ 2); rank candidates by value with a seeded tie-break.
- [x] 1.4 Compute the boldness budget `B` from risk + pool size (named, tunable constants; monotonic: safe ≤ balanced ≤ bold, larger pool ≥ smaller). Select the top-`B` matches.
- [x] 1.5 Pass 2 — walk top-down; pick the underdog of the actual participants at selected matches, the favorite elsewhere, so the bracket stays feasible.
- [x] 1.6 Add a pure `recommendRisk(poolSize) → { risk, rationale }` (small → safer, large → bolder; tunable thresholds).
- [x] 1.7 Export the generator, `recommendRisk`, and `RiskLevel` from `lib/engine/index.ts`.

## 2. Server + API

- [x] 2.1 Add `generateBracket(poolSize, risk)` to `lib/server/predictor.ts` injecting `eloHeadToHead` + the projection; return `[matchId, teamId][]`.
- [x] 2.2 Add `app/api/predictor/generate/route.ts` (`POST`, nodejs, force-dynamic): validate `{ poolSize: number ≥ 1, risk: RiskLevel }`, call the helper, return `{ picks }`; client-error on malformed input.

## 3. Build box UI

- [x] 3.1 In `app/components/BracketVerdict.tsx`, turn the incomplete state into the Build box: keep the pool-size input, add a risk slider (Safe ↔ Balanced ↔ Bold) defaulting to the recommended level, surface the recommendation text, and add a "Build my bracket for me" button.
- [x] 3.2 On Generate, `POST /api/predictor/generate` with `{ poolSize, risk }`, then call an `onGenerate(picks)` prop; show a loading state on the button while in flight and an error state on failure.
- [x] 3.3 Confirm before overwriting when the bracket already has picks.

## 4. Populate into the predictor

- [x] 4.1 In `app/components/BracketPredictor.tsx`, pass `onGenerate(picks)` to `BracketVerdict` that sets + persists the picks via the existing pick/persist path so the populated bracket is editable, cascades, and re-scores; completeness then flips to show the verdict card.

## 5. Tests

- [x] 5.1 Engine: output is complete and feasible for each risk level; `safe` is (near) chalk; underdog count is non-decreasing safe→balanced→bold and strictly greater at bold than safe; larger pool ≥ smaller at a fixed risk.
- [x] 5.2 Engine: a higher-value upset is preferred over a lower-value one for a one-upset budget; coin-flip (multiplier 1) candidates are not spent on; `bold` on a large pool can crown an underdog while `safe` keeps the favorite.
- [x] 5.3 Engine: determinism — same inputs + seed → identical bracket; `recommendRisk` returns safer for small pools and bolder for large pools.

## 6. Verify

- [x] 6.1 Verify in preview: the incomplete panel shows the Build box with the risk slider + recommendation; Generate populates a complete bracket, the picks are editable in the tree, the verdict card then appears; bolder settings visibly take more upsets; overwrite confirm works.

## 7. Spec sync

- [x] 7.1 Confirm the implementation matches every scenario in `specs/bracket-generator/spec.md` and the modified `specs/bracket-verdict-card/spec.md`; keep code and specs in sync.
