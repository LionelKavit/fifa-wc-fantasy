## 1. Ratings ingestion

- [x] 1.1 Add a `scripts/` ingestion task that fetches the World Football Elo TSV from eloratings.net and parses the per-team current ratings.
- [x] 1.2 Map each rating to a squad id (1–48) via normalized name/abbr plus a hand-maintained override table; fail loudly if any tournament team is unmapped.
- [x] 1.3 Validate source shape and team coverage; on drift or missing teams, error out without overwriting the existing snapshot.
- [x] 1.4 Write the committed snapshot `lib/data/ratings.json` (`{ squadId: elo }`, plus an as-of date).

## 2. Engine — strength + home advantage

- [x] 2.1 Add a loader that reads `ratings.json` and builds a `strengths` map: `strength = exp(K·(elo − eloRef)/400)` (eloRef = field mean), with neutral fallback for any unrated team.
- [x] 2.2 Update `createPoissonModel` (`lib/engine/outcome.ts`) so home advantage applies only to a WC 2026 host (USA/MEX/CAN) playing at home; otherwise no home term.
- [x] 2.3 Wire the derived `strengths` into the model where the simulation is constructed (server/provider), leaving the simulation loop and all downstream consumers unchanged.

## 3. Tests (Vitest)

- [x] 3.1 Strength derivation: higher Elo → higher multiplier; an unrated team → neutral (1.0); average team ≈ 1.
- [x] 3.2 Outcome model: a large Elo gap yields a materially lopsided win probability (not ~50/50); home advantage applied only for a host at home.
- [x] 3.3 Ingestion mapping: every tournament team maps to a rating; an unmapped team fails the run (use a fixture, not the live source).

## 4. Verification

- [x] 4.1 Verify in the running app (preview): a strong-vs-weak R32 matchup now reads lopsided (not ~54/46) and the blanket "upset watch" noise is gone.

## 5. Spec sync

- [x] 5.1 Confirm implementation matches every scenario in `specs/data-ingestion/spec.md` and `specs/advancement-probability/spec.md`; keep code and specs in sync (note final `K` and host handling).
