## 1. Engine types

- [x] 1.1 Define `StandingRow`, `GroupTable`, `Verdict` (`clinched|eliminated|alive`), and required/eliminating-condition types in `lib/engine/types.ts`

## 2. Standings

- [x] 2.1 Implement points/goals accumulation from completed group fixtures in `lib/engine/standings.ts`
- [x] 2.2 Implement the FIFA comparator: points → GD → goals-for across all matches
- [x] 2.3 Implement recursive head-to-head mini-table among tied teams, then fair-play, then deterministic lots seed
- [x] 2.4 Add provisional mode that optionally folds a live fixture's current score, marking the table provisional
- [x] 2.5 Unit-test standings: completed-only default, GD/goals separation, head-to-head re-ranking, deterministic tie output

## 3. Remaining-result enumeration

- [x] 3.1 Identify remaining group fixtures from the snapshot per group
- [x] 3.2 Enumerate W/D/L combinations; for margin-sensitive tiebreaks evaluate boundary margins only (smallest decisive + saturating large), relying on GD monotonicity
- [x] 3.3 Unit-test that boundary-margin enumeration is complete: a case that clinches only at a large margin is `alive`, one that finishes top 2 even at worst margin is `clinched`

## 4. Top-two verdict

- [x] 4.1 Classify each team `clinched`/`eliminated`/`alive` by testing top-2 membership across all enumerated combinations in `lib/engine/verdict.ts`
- [x] 4.2 For alive teams, derive sufficient (clinching) and eliminating result conditions, including dependencies on other fixtures
- [x] 4.3 Flag third-place-only teams for the probabilistic layer and ensure they are never falsely `eliminated`
- [x] 4.4 Unit-test verdicts against the recorded snapshot and constructed edge cases (clinched, eliminated, dependent-alive, third-place-only)

## 5. Public API

- [x] 5.1 Export `computeGroupStandings(snapshot, groupId, opts?)` and `computeQualificationVerdicts(snapshot, groupId)` from `lib/engine/index.ts`
- [x] 5.2 Verify outputs are pure, serializable, and consumable by the probabilistic layer
