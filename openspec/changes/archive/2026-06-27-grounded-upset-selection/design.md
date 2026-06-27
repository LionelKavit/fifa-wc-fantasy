## Context

`generateBracket` selects upsets by `DEFAULT_STAGE_WEIGHTS[stage] × upsetMultiplier × pUnderdog`, where the weights double per round and `pUnderdog` is the single-match conditional probability. Depth wins on the weight alone, so weak teams get chained deep, and the heuristic is tuned to *our* scoring scheme. The engine already produces the right grounded quantity elsewhere: `knockoutProbabilities` gives each team `reachR16/reachQF/reachSF/reachFinal/champion` — marginal, compounded, non-increasing odds. We switch selection to plausibility (those compounded odds) × differentiation (contrarian vs. the chalk field), dropping our round weights from the selection.

## Goals / Non-Goals

**Goals:**
- Select upsets by expected differentiation, scheme-robust: plausibility (compounded) × contrarianness.
- Remove `DEFAULT_STAGE_WEIGHTS` from selection (kept for scoring/verdict only).
- Keep budget, favor/fade, seeded variety, feasibility, determinism, and the multiplier *gate*.

**Non-Goals:**
- No change to scoring (`bracket-prediction-scoring`), the verdict card, or the pool-finish sim.
- Not leverage-driven selection; not configurable pool scoring (both deferred).

## Decisions

**1. Selection value = plausibility × differentiation.** For a candidate upset at match `M` (chalk participants, underdog `U`):
- `plausibility = stageWinProb(U, stage(M))` — `U`'s marginal probability of winning a match at that stage (= reaching the next stage). Compounds down, so deep upsets need a realistically-reaching team.
- `differentiation = 1 − fieldShare(U)`, where `fieldShare(U) = pU^γ / (pU^γ + (1−pU)^γ)` using the public chalk bias `PUBLIC_CHALK_GAMMA` and the conditional matchup prob `pU` — i.e. how unlikely the chalk-biased field is to also have this underdog.
- `value = plausibility × differentiation`, then × `SIGNAL_BIAS` for favor/fade matches and × the seeded jitter (both unchanged). **No round weight, no multiplier, in the value.**

**2. Multiplier stays as a gate only.** A candidate is eligible iff `upsetMultiplier(pU) ≥ 2` (a real underdog, `pU < upper cutoff`) — same as today. It no longer weights the value.

**3. Reach probabilities as a deterministic input.** `generateBracket` gains `stageWinProb?: (teamId, stage) => number`. The server (`generatePrediction`) builds it from `knockoutProbabilities` (already computed for champion odds in `getBracketData`), mapping stage → reach field: R32→reachR16, R16→reachQF, QF→reachSF, SF→reachFinal, F→champion. The map is a pure lookup; the MC that produced it is seeded, so generation stays deterministic.

**4. Fallback when probabilities are absent.** If `stageWinProb` is not supplied, fall back to the prior conditional weighting so the pure engine remains usable without an MC (and existing engine tests keep their meaning). The application always supplies it, so the grounded path is what users get.

**5. Everything else unchanged.** Budget from risk + pool size; favor/fade ×1.5; seeded jitter for Regenerate; top-down feasibility; determinism. `DEFAULT_STAGE_WEIGHTS` is dropped from the generator's imports/selection (still exported from `predictionScore` for scoring).

## Risks / Trade-offs

- **Brackets get realistically chalkier deep.** With round weights gone and deep upsets gated by compounded probability, the generator rarely sends an underdog to the final unless a strong non-favorite has real title odds. That's the intent (realistic brackets); "bolder" risk and favor signals can still push depth.
- **Differentiation term is mild.** `1 − fieldShare(U)` is ≈1 for most underdogs, so plausibility dominates — the generator favors the *most plausible* real upsets. Acceptable and on-thesis (a likely contrarian-correct pick is what differentiates in a small pool); the term still tilts toward the more contrarian of two equally-plausible upsets.
- **Selection vs. scoring split.** The verdict still displays points under our scheme, while selection optimizes realistic differentiation. This is deliberate: the displayed score is one lens; the generator shouldn't stat-pad against it. The honest end-state for a user's own pool is configurable scoring (deferred).
- **Depends on stable reach odds.** Determinism relies on the supplied reach probabilities being stable; `getBracketData` caches them per snapshot, so they are.
