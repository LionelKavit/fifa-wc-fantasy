## Context

Phase B (`knockout-probability`) gives per-team stage-reach probabilities and per-pairing conditional win probabilities, both from the bracket play-out in `simulate`. Phase C gives the prediction model (`Prediction`, derived view) and reality-based scoring (`scorePrediction`). This change overlays the two: annotate a fan's picks with model probabilities, measure how likely the *whole* bracket is, reward contrarian correctness, and summarize divergence from the model's chalk bracket. It's the "you vs. the model" differentiator; share cards and UI consume its output.

## Goals / Non-Goals

**Goals:**
- Per-pick model probability (marginal, from `knockout-probability`).
- Bracket survival probability per round, simulation-estimated (joint, not a product of marginals).
- Contrarian-adjusted scoring layered on `bracket-prediction-scoring`.
- Chalk bracket + per-pick agreement + aggregate divergence.
- Pure, deterministic (seeded).

**Non-Goals:**
- UI, share-card rendering, API, storage.
- Multi-fan leaderboards or contrarian ranking across fans.
- Changing B's or C's outputs/requirements.

## Decisions

**1. Per-pick model probability = the picked team's marginal reach probability for the round the pick wins into.**
Picking a team to win an R32 match → model P(team reaches R16); an R16 match → P(reaches QF); … the Final → P(champion). These come straight from `knockout-probability`'s `stageReach`, are well-defined for every pick, and read naturally as "the model gives this X%". Alternative — the conditional matchup win prob `P(team wins | this matchup)` — is appealing for a *displayed* tie but undefined when the predicted matchup never occurs in trials; the marginal is always defined. We use the marginal for annotation and contrarian scoring. (The conditional remains available from B for UI tooltips.)

**1b. Two simulations: a "baseline" (pre-knockout) and a "live" (as it stands).** *(decided — authenticity)*
Per-pick probability, the chalk bracket, and contrarian scoring use a **baseline** simulation that re-simulates every knockout match (`ignoreCompletedKnockouts: true`), so a correctly-called upset still reads as the long shot it was and earns its full contrarian bonus — computing these from the results-fixed sim would collapse a decided pick to ~100% and pay no bonus, which would be the opposite of the feature's point. Survival uses a separate **live** simulation that holds already-decided real results fixed ("as it stands"), per the requirement. Both run on the same seed for determinism. The baseline depends only on the snapshot (not the prediction), so it is cacheable across predictions if needed.

**2. Survival is measured by simulation, not multiplied marginals.**
Picks are not independent (a later pick is conditional on the earlier picks holding), so multiplying per-pick marginals is wrong. Instead, extend the Monte Carlo play-out to optionally evaluate a prediction per trial: in each trial, walk the predicted picks round by round and record the deepest round through which they all match the trial's outcomes; increment a per-round survival counter. Survival(round R) = trials surviving ≥ R / trials. This is the authentic joint probability and is robust for rare deep paths. Reuses the existing per-trial bracket play-out (the participants and winners are already computed there).

**3. Survival extension lives in the simulation layer, behind an option.**
Add an optional `prediction` input to the knockout play-out (or a sibling `bracketSurvival(snapshot, prediction, opts)`), so the default odds path is unaffected. It produces per-round survival counts alongside the existing accumulators. Keeping it seeded preserves determinism.

**4. Contrarian scoring = base status from `scorePrediction`, points reweighted by a factor decreasing in model probability.**
Reuse `scorePrediction` for the `correct/wrong/busted/pending` status (single source of truth). For `correct` picks, contrarian points = `stageWeight × contrarianFactor(modelProb)`, where `contrarianFactor` is configurable and non-increasing in `modelProb`. A sensible default such as `1 / max(modelProb, ε)` (rarer → bigger) or `1 + (1 − modelProb)·k`; exact default pinned in implementation. Spec only mandates monotonic non-increase and "only correct picks earn".

**5. Chalk bracket = the model's most-likely path, built with the same prediction model.**
Construct the chalk `Prediction` by walking the bracket from R32 upward, at each match picking the participant the model rates more likely to win (using the conditional matchup prob when available, else the marginal reach). Reusing `pick()` from `bracket-prediction` guarantees the chalk bracket is itself valid/consistent. Divergence = per-pick equality vs the fan's picks + an aggregate (count/share differing).

## Risks / Trade-offs

- **Rare predicted matchups → noisy conditional probs** → use marginals for annotation/scoring (always defined); reserve conditionals for display where meetings are sufficient.
- **Survival of a very contrarian bracket can be ~0 at high rounds with finite trials** → report it honestly (it may round to 0 at the default trial count); the headline is still meaningful at earlier rounds. Allow a higher trial count via options.
- **Contrarian factor shape is a product choice** → make it configurable; spec fixes only the monotonic property so we don't bikeshed in the spec.
- **Determinism across two simulations** (odds + survival) → drive both from the same seed/trial settings, or compute survival in the same pass that produces stage/matchup counts.

## Resolved Questions

- **Survival "as it stands"** → resolved (yes): survival is computed from the live simulation with already-decided knockout results fixed; per-pick odds/chalk/contrarian use the baseline (pre-knockout) simulation. See Decision 1b.
- **Default contrarian factor** → `1 / max(modelProb, 0.02)` (inverse probability, floored to cap at 50×), configurable. Spec fixes only the monotonic-non-increasing property.
