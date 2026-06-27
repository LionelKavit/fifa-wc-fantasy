## Context

Elo ratings are the single input, but two transforms turn them into `P(A beats B)`:
- `eloStrengths` (`exp(K·(elo−mean)/400)`) → Poisson goal rates → `createPoissonModel` → Monte-Carlo (`montecarlo`/`knockoutProbabilities`): drives advancement, champion, survival, matchup odds, pool-finish. Flatter.
- `eloWinExpectancy` (`1/(1+10^(−Δelo/400))`): the head-to-head used by the card, Analyst, upset multiplier, generator, opponent field, verdict. Sharper.

So the displayed head-to-head ≠ the simulation. This change retires the logistic and derives every head-to-head from the Poisson model in closed form, so display and simulation agree.

## Goals / Non-Goals

**Goals:**
- One `P(A beats B)` — a Poisson closed form that matches the simulation — used everywhere a head-to-head is shown or decided on.
- Define the head-to-head's home-advantage context (neutral default; host-only).
- Re-calibrate the constants tuned against the logistic; keep determinism/purity/feasibility.

**Non-Goals:**
- Leverage-driven generation (change B); configurable pool scoring.
- Changing Poisson params (baseRate, home advantage, etLambda) beyond defining the head-to-head context.
- Making extra time strength-aware (would require updating the ½-draw term).

## Decisions

**1. Closed form mirrors the engine's match resolution.** `poissonHeadToHead(λ_A, λ_B)` = `Σ_{a>b} P(a;λ_A)P(b;λ_B) + ½·Σ_g P(g;λ_A)P(g;λ_B)`, P = Poisson PMF, summed over goals `0..GOAL_CAP` (~12, tail mass negligible). The ½ is exact: `montecarlo.playKnockout` resolves a regulation draw with extra time at a **symmetric** `etLambda` (both sides) then 50/50 penalties → a regulation draw is a coin flip. (If ET ever becomes strength-aware, replace ½ with the ET closed form — noted.) Pure, O(GOAL_CAP²) per call.

**2. Rates from the same source as the sim.** `λ = baseRate × eloStrength(team) × homeBoost`, with `baseRate`/`homeAdvantage` defaults from `outcome.ts` and `eloStrength` from the `STRENGTHS` map (`eloStrengths(ratings)`) in `lib/server/model.ts`. So the closed form and the simulation use identical rates → they agree.

**3. Home-advantage context.** A head-to-head is **neutral** by default (no boost). When a host team is the home side (per the snapshot's host set / `hostTeamIds`), apply the host boost — matching the sim. Most knockout head-to-heads (card, Analyst, generator) are computed neutral; the host case is applied where the fixture is a host home match.

**4. Wiring — change what the existing seams point at.** The generator and pool-finish already take a `matchupWinProb(a,b)` function; the card/multiplier use `predictor.ts#eloHeadToHead`; `compare_teams` uses `ctx.ratings` + the logistic. Repoint all of them at the Poisson closed form:
- Engine: add the pure `poissonHeadToHead`; keep `eloStrengths`. Remove `eloWinExpectancy` from the engine surface once unused.
- `predictor.ts`: reimplement `eloHeadToHead(a,b)` as `poissonHeadToHead` over `STRENGTHS` (neutral, host-aware when applicable). It already feeds card `serialize`, the upset multiplier, the generator wiring, and the pool-finish field — so those move together.
- Scout: give the Scout context a `matchupWinProb(a,b)` (the same closed form) and have `compare_teams` use it instead of `ctx.ratings` + the logistic.

**5. Re-calibrate the logistic-tuned constants.** The Poisson head-to-head is flatter, so: the upset bands (`UPSET_MULTIPLIER_CUTOFFS` 0.40/0.20) likely move (fewer matches clear them); the generator's favor/fade dominance and seeded-variety still need to hold; the opponent-field `PUBLIC_CHALK_GAMMA` may need a nudge. Treat all as named constants; re-pick by feel + update the affected tests' expected numbers. Validate that the generator still avoids far-fetched deep upsets and that the verdict/pool-finish behave sensibly.

## Risks / Trade-offs

- **Broad re-validation.** Five consumers move onto new (flatter) numbers; their tuned constants and tests must be revisited. This is the cost of true unification — sequence carefully and lean on the existing test suites.
- **Behavior shift for users.** Head-to-heads (and the upset bands they feed) change — e.g. a favorite that read 64% may now read ~59%. Intended (now matches the model), but visible. The verdict/“you vs the model” numbers are unaffected in source (already Monte-Carlo) but the bands on top of them re-tune.
- **Closed-form vs sim drift.** They agree only while the closed form mirrors the sim's resolution (symmetric ET + 50/50 pens, same rates, same host rule). A property test should assert the closed form ≈ `knockoutProbabilities` matchup odds to catch divergence.
- **GOAL_CAP truncation.** Negligible tail beyond ~12 goals; pick a cap that keeps error < 1e-6 and assert normalization.
