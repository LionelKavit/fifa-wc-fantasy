## Why

"P(A beats B)" is computed two ways from the *same* Elo ratings: the **Poisson Monte-Carlo** (`eloStrengths` → goal rates → simulate) drives every aggregate figure (advancement, champion, survival, matchup odds, pool-finish), while the **Elo logistic** (`eloWinExpectancy`) is used for the displayed/decision head-to-heads (card, Analyst, upset multiplier, generator, opponent field, verdict). They disagree (logistic is sharper), so the head-to-head we *show* doesn't match the simulation that *computes* the odds. We previously aligned card-vs-Analyst onto the logistic; this change makes the head-to-head match the **simulation** instead — one model, used both as a closed form and as a sampler.

## What Changes

- **Add a closed-form Poisson head-to-head** that equals (in the limit) how the Monte-Carlo resolves a knockout match: `P(A beats B) = Σ_{a>b} Pois(a;λ_A)·Pois(b;λ_B) + ½·Σ_g Pois(g;λ_A)·Pois(g;λ_B)`, with `λ = baseRate × eloStrength(team) × homeBoost`. The ½-draw term is exact because the engine's extra time is symmetric and penalties are 50/50. It's a cheap double sum (goals 0..~12; no Bessel), fine for hot loops.
- **Retire the Elo logistic** (`eloWinExpectancy`) and use the Poisson closed form for every head-to-head: the bracket card (R32 win %), the Analyst `compare_teams`, the upset multiplier, the generator's matchup/contrarian term, the opponent-field sampling, and the verdict chalk. The closed form must agree with the Monte-Carlo matchup odds, so the displayed number matches the sim.
- **Head-to-head context:** computed **neutral by default**; host home-advantage applies only when a host team plays on home soil (the logistic ignored this — now pinned).
- **Re-calibrate what was tuned against the logistic:** the upset-multiplier band cutoffs (×2 < 0.40, ×3 < 0.20), the generator's selection (favor/fade dominance, seeded variety), and the opponent-field chalk-bias γ. The new probabilities are flatter, so these named, tunable constants likely shift; test expectations update accordingly.
- **Unchanged:** Elo ratings stay the single input; `eloStrengths` stays the single transform; the group stage keeps simulating goals (needs goal-level outcomes); all aggregate odds keep coming from the Monte-Carlo model; determinism, purity, and feasibility hold.

## Capabilities

### New Capabilities
- `matchup-probability`: the single source of "P(A beats B)" — a pure, deterministic Poisson closed form derived from the team strengths, computed neutral with host-only home advantage, that agrees with the Monte-Carlo matchup odds.

### Modified Capabilities
- `bracket-predictor-ui`: the card's matchup win probability comes from `matchup-probability` (the Poisson model that matches the simulation), not the Elo logistic.
- `bracket-prediction-scoring`: the upset multiplier reads the picked team's win probability from `matchup-probability`; the band cutoffs stay a named tunable constant and may be re-tuned for the flatter probabilities.

## Impact

- **Engine** (`lib/engine`): a new pure `poissonHeadToHead(λ_A, λ_B)` (or strengths + baseRate) helper; `eloWinExpectancy` removed from the engine surface once callers move off it.
- **Server** (`lib/server/predictor.ts`): `eloHeadToHead(a, b)` reimplemented as the closed form over `STRENGTHS` (neutral/host-aware) and reused by the card serialize, the upset multiplier, the generator wiring, and the pool-finish field; the Scout context provides a `matchupWinProb` so `compare_teams` (`lib/scout/tools.ts`) uses the same source instead of `ctx.ratings` + the logistic.
- **Consumers with model-agnostic specs** (`bracket-generator`, `pool-finish-simulation`, `scout-tools` head-to-head) change in implementation only — their wording already says "the model's head-to-head," so no spec delta, but their tuned constants/tests update.
- **No change** to `data-ingestion` (Elo ratings remain the ingested input) or the group-stage goal simulation.
- Deferred/noted: leverage-driven generation (change B); configurable pool scoring; making extra time strength-aware (would require the closed form's ½-draw term to track it).
