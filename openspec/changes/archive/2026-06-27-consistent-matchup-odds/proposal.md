## Why

A user saw the bracket card show **NED 59%** to win its Round-of-32 match, then asked the Analyst, who said **64%** — for the same matchup. Two different models are computing "P(A beats B)": the card uses the Monte-Carlo Poisson simulation's matchup odds, while the Analyst (and the upset multiplier, the generator, the opponent field, and the verdict) all use the **Elo head-to-head** `1/(1+10^(-Δelo/400))`. So the card's number is the odd one out — it even disagrees with the upset-points shown on the same card. For a tool whose whole value is *grounded, trustworthy numbers*, showing two answers for one matchup undermines confidence.

## What Changes

- **Standardize the user-facing per-matchup head-to-head on a single source — the Elo head-to-head** — so the bracket card and the Analyst report the same number for the same matchup.
  - In `lib/server/predictor.ts#serialize`, compute the Round-of-32 slot win % (and the "upset watch" flag) from the Elo head-to-head instead of the Monte-Carlo matchup odds.
  - On the Round-of-32 card, show this Elo head-to-head **whether or not the slot is picked**, so the displayed % doesn't flip between picked and unpicked states.
- **Remove the duplicated Elo formula**: extract the single Elo head-to-head helper (currently `eloWinProb` in `lib/scout/tools.ts` and `eloHeadToHead` in `lib/server/predictor.ts`) into one shared pure function used by both, so they can never drift.
- **Keep the Monte-Carlo Poisson model** as the driver of all *aggregate* odds — advancement probabilities, champion odds, survival, pool-finish. Those are not head-to-heads and won't be directly compared; only the per-matchup head-to-head *display* is standardized.

## Capabilities

### Modified Capabilities
- `bracket-predictor-ui`: the bracket's per-matchup win probability is shown from the same Elo head-to-head the Analyst uses (consistent across surfaces), and is shown identically whether or not the slot is picked.

## Impact

- **Server** (`lib/server/predictor.ts#serialize`): the Round-of-32 slot win % and upset-watch flag derive from the Elo head-to-head (via the shared helper + `TEAM_ELO`), not `knockoutProbabilities().matchups`. `serialize` no longer needs the Monte-Carlo `odds` for the win %.
- **Shared helper**: a single `eloHeadToHead(eloA, eloB)` (pure) used by both `lib/scout/tools.ts#compare_teams` and the predictor; the duplicate is removed.
- **UI** (`app/components/BracketPredictor.tsx`): the Round-of-32 matchup % is shown from `slot.winProb` (now Elo) consistently for picked and unpicked slots. The deeper-round per-pick "model probability" (`info.modelProb`, a distinct *marginal* "chance this pick comes true") is unchanged and out of scope.
- **No change** to how aggregate odds (advancement, champion, survival, pool-finish) are computed. Deferred: fully unifying the Poisson and Elo models into one (a larger effort).
