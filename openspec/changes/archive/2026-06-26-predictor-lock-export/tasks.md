## 1. Finalize + export UI

- [x] 1.1 Add a "Lock & export" control on `/predictor` that finalizes the current picks and reveals export options (CSV, image card). Soft commit — editing + re-export still allowed.
- [x] 1.2 Distinguish this from the tournament-kickoff read-only lock (no permanent lock here).

## 2. CSV export

- [x] 2.1 Build a client-side CSV from the current picks: `round, match, pick` (human-readable team names, ordered R32→Final, champion called out); proper quoting for names with commas/accents.
- [x] 2.2 Trigger a download (Blob) of the CSV reflecting the on-screen bracket.

## 3. Image export

- [x] 3.1 Wire the image option to the `predictor-share-card` route for the current prediction.

## 4. Verification

- [x] 4.1 Verify in the running app (preview): fill a bracket → lock → download CSV (matches picks) and generate the image card; partial bracket exports with an "incomplete" note.

## 5. Spec sync

- [x] 5.1 Confirm implementation matches every scenario in `specs/bracket-predictor-ui/spec.md` (this change's additions); keep code and specs in sync.
