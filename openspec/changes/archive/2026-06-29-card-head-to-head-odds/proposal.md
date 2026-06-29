# Per-pick odds = head-to-head vs the predicted opponent

## Why

The percentage shown next to a future-round pick on the bracket card is the model's
**marginal** probability that the team reaches the next round (`modelProb`) — blended over
every opponent it might face. Users read it as "this team's chance to win this match", and
it disagrees with the head-to-head number the Analyst gives (e.g. the card showed Colombia
50% in the Round of 16 while the Analyst said 69% to beat Algeria). The two answer different
questions, but the marginal one is unintuitive against a visible bracket where you can see
exactly who the pick plays. The fix is to show the **head-to-head probability against the
pick's predicted opponent** — the same number the Analyst's matchup comparison uses.

This is display-only. The engine still generates/picks the bracket exactly as it does today
(the underlying optimisation is unchanged); only the surfaced per-pick figure changes.

## What changes

- The bracket card's per-pick percentage SHALL be the **head-to-head win probability against
  that pick's predicted opponent** (already computed as `headToHead` in the model comparison),
  not the marginal reach probability. The Round-of-32 per-team head-to-head display is
  unchanged (it already shows the matchup head-to-head).
- For consistency, the bracket-evaluation tool's per-pick `win` figure SHALL likewise be the
  head-to-head against the predicted opponent, so the card and the Analyst report the same
  number for the same pick.

## Impact

- Affected specs: `bracket-predictor-ui` (per-pick probability), `scout-tools` (evaluation
  tool per-pick win).
- Affected code: `app/components/BracketPredictor.tsx` (card render), `lib/scout/tools.ts`
  (`evaluate_bracket` per-pick `win`).
- No change to bracket generation, scoring, the Monte-Carlo model, or aggregate odds.

## Out of scope

- The separate chat text-alignment fix (a styling bug, handled directly).
- Any change to how picks are chosen by the generator.
