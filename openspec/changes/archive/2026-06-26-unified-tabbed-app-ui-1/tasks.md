## 1. Theme tokens & contrast

- [x] 1.1 Define theme tokens (base, surface, border, text, muted, gold, green) in `globals.css`; commit to gold primary + green accent, dropping the teal/amber/orange triple-gradient.
- [x] 1.2 Raise contrast across the app: brighter body/label text (replace the low-contrast micro-labels), clearer hierarchy and spacing in `AppShell`, `BracketPredictor`, and `ScoutChat`.

## 2. Blank future-round slots

- [x] 2.1 In `BracketPredictor`, render undetermined later-round slots as empty/quiet cells (no "Winner of M.." labels); show a team only when determined by a pick/projection/result.

## 3. Leaderboard-style scorecard

- [x] 3.1 Restyle the `Headline` panel into a standings/scorecard: Projected Score as a large gold hero with a pool-aware caption, then scannable labelled rows (Still alive, Score/max, Upset bonus, Boldness, Champion). Keep the pool-size control and all `data-testid`s/figures.
- [x] 3.2 Use consistent row rhythm/dividers rather than equal boxes; keep it compact so the bracket keeps room.

## 4. Verification

- [x] 4.1 Verify in preview (desktop): the app is comfortably readable; future-round slots are blank until filled; the scorecard reads as a bracket-pool standings card; gold/green WC 2026 theme is consistent across tabs and chat; numbers unchanged.

## 5. Spec sync

- [x] 5.1 Confirm implementation matches every scenario in `specs/bracket-predictor-ui/spec.md` and `specs/app-shell/spec.md`; keep code and specs in sync.
