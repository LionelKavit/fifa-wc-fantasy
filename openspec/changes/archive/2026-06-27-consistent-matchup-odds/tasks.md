## 1. Shared Elo helper

- [x] 1.1 Add a pure `eloWinExpectancy(eloA, eloB)` = `1/(1+10^(-(eloA−eloB)/400))` to `lib/engine` and export it from the engine index.
- [x] 1.2 Replace `eloWinProb` in `lib/scout/tools.ts` and `eloHeadToHead` in `lib/server/predictor.ts` with the shared helper (each still supplies its own ratings: `ctx.ratings` / `TEAM_ELO`); delete the duplicates. Verify the Analyst's `compare_teams` output is unchanged.

## 2. Card uses the Elo head-to-head

- [x] 2.1 In `lib/server/predictor.ts#serialize`, compute the Round-of-32 slot `winProb` from the Elo head-to-head (shared helper + `TEAM_ELO`) instead of `odds.matchups`; compute the R32 `upset` flag from the same Elo probabilities (`max(p, 1−p) ≤ UPSET_THRESHOLD`). Drop the now-unused Monte-Carlo `winProbFor`/`odds` usage in `serialize` (keep `odds` only where still needed, e.g. champion odds).
- [x] 2.2 In `app/components/BracketPredictor.tsx` MatchCard, render the Round-of-32 matchup % from `slot.winProb` (Elo) consistently whether or not the slot is picked; keep appending the "· N pts" upset value when picked. Leave deeper-round picked cards showing `info.modelProb` unchanged.

## 3. Tests

- [x] 3.1 A unit/route test: the bracket data's R32 `slot.winProb` for a matchup equals the Elo head-to-head from the shared helper (and equals what `compare_teams` reports for the same two teams) — i.e. card and Analyst agree.
- [x] 3.2 Confirm existing scout `compare_teams` tests still pass (head-to-head output unchanged after the helper extraction).

## 4. Verify

- [x] 4.1 Verify in preview: an R32 card's win % matches the Analyst's answer for the same two teams (e.g. the NED vs MAR case), and the % does not change when the slot is picked/unpicked. Aggregate figures (champion/survival) still render.

## 5. Spec sync

- [x] 5.1 Confirm the implementation matches every scenario in `specs/bracket-predictor-ui/spec.md` (this change's additions); keep code and spec in sync.
