## Context

`P(A beats B)` is computed two ways in the app:
- **Monte-Carlo Poisson** (`knockoutProbabilities().matchups`): the simulation engine that also drives advancement, champion, survival, and pool-finish. Flatter (compresses favorites; draws → extra time → 50/50 penalties).
- **Elo logistic** `1/(1+10^(-Δelo/400))`: a closed form used by the Analyst (`compare_teams`/`eloWinProb` in `tools.ts`), the upset multiplier, the generator, the opponent field, and the verdict (`eloHeadToHead` in `predictor.ts` — a duplicate of the same formula).

The bracket card's R32 win % (`serialize#winProbFor`) reads the Monte-Carlo matchups — the only user-facing head-to-head that doesn't use Elo. Result: card 59% vs Analyst 64% for NED vs MAR, and even a mismatch with the Elo-derived upset-points on the same card.

## Goals / Non-Goals

**Goals:**
- One source of truth for the user-facing per-matchup head-to-head (Elo), so the card and the Analyst agree.
- R32 card shows the same head-to-head whether or not the slot is picked.
- Remove the duplicated Elo formula.

**Non-Goals:**
- No change to aggregate odds (advancement/champion/survival/pool-finish) — still Monte-Carlo.
- Not unifying the Poisson and Elo models everywhere (deferred, larger).
- The per-pick marginal "model probability" (`info.modelProb`) is a different quantity and is unchanged.

## Decisions

**1. Standardize on the Elo head-to-head for displayed matchups.** It's already the source for the Analyst, the multiplier, the generator, the field, and the verdict — so aligning the card to Elo makes *everything user-facing* consistent with the least change (vs. switching five places to Monte-Carlo, which would also need a per-arbitrary-pair head-to-head the matchups table doesn't always have).

**2. `serialize` uses Elo for the R32 win % + upset flag.** Replace `winProbFor` (Monte-Carlo `odds.matchups`) with the shared Elo helper over `TEAM_ELO`. `slot.winProb` for an R32 slot becomes that team's Elo win probability vs. its opponent; the `upset` flag uses `max(pElo, 1−pElo) ≤ UPSET_THRESHOLD`. `serialize` no longer needs the `odds` argument for the win % (the bracket still gets champion odds etc. elsewhere, unchanged).

**3. Shared pure helper in `lib/engine`.** Extract `eloWinExpectancy(eloA, eloB): number` (the `1/(1+10^(-Δ/400))` formula) into the pure engine layer and export it from `lib/engine`. Both `lib/scout/tools.ts#compare_teams` and `lib/server/predictor.ts` import it (each supplies its own ratings — `ctx.ratings` / `TEAM_ELO`); delete the two duplicates. Placing it in `lib/engine` (not `lib/server`) avoids a `lib/scout → lib/server` import cycle, since `predictor.ts` already imports from `lib/scout`. The Analyst's number is unchanged (same formula, same ratings) — only the card moves onto it.

**4. UI: R32 % stable across pick state.** In `BracketPredictor.tsx` the R32 matchup % should render from `slot.winProb` (now Elo) regardless of pick state, so picking doesn't swap it for `info.modelProb`. The "· N pts" upset value (Elo-derived) still appends when a pick is made. Deeper-round picked cards keep showing `info.modelProb` (the marginal "chance it comes true"), which is a distinct stat, not a head-to-head.

## Risks / Trade-offs

- **Display (Elo) vs. simulation (Poisson) still differ internally.** The card's head-to-head won't exactly equal the Poisson model that produces the aggregate odds. Accepted: those aggregates aren't single-matchup head-to-heads, so users won't see a direct contradiction; full model unification is deferred. The change removes the *visible* contradiction (card vs. Analyst) and the within-card %-vs-points mismatch.
- **Slightly different "upset watch" flags.** Using Elo instead of Monte-Carlo may flag a different set of R32 matches as upset-watch. This is intended — it now matches the Elo-based upset multiplier and scoring.
- **Helper placement.** The shared Elo helper goes in `lib/engine` (pure, takes raw Elo values) rather than `lib/server`, to avoid a `lib/scout → lib/server` import cycle (`predictor.ts` already imports from `lib/scout`). Each caller supplies its own ratings.
