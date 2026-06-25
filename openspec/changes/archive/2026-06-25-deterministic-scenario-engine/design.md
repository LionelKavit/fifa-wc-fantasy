## Context

This is "Layer 1" of the Scenario Engine: the deterministic math over a single group. It consumes the typed `TournamentSnapshot` from the `data-ingestion` capability and produces standings + top-2 verdicts. The hard cross-group question (which third-placed teams advance) is deliberately excluded and handed to the probabilistic layer. As of 2026-06-24 each group has at most 2 remaining fixtures, so brute-force enumeration of remaining group results is trivially cheap; the design relies on that rather than on probability.

## Goals / Non-Goals

**Goals:**
- Correct FIFA-rule standings, including the recursive head-to-head mini-table among tied teams.
- Exhaustive, exact top-2 verdicts (clinched/eliminated/alive) — no sampling, no probability.
- Human-meaningful "what do they need" output the LLM can verbalize.
- Pure functions, fully unit-tested against the recorded snapshot.

**Non-Goals:**
- No cross-group third-place ranking or best-8 selection (probabilistic layer owns it).
- No probabilities or likelihoods.
- No knockout-stage logic.
- No natural-language generation (LLM layer) or UI.

## Decisions

- **Brute-force enumeration of remaining group results.** With ≤2 group matches left, enumerate the discrete outcome space (per match: home win / draw / away win, plus goal-margin variation where it can affect tiebreakers) and test top-2 membership across all combinations. Alternative: analytic inequalities — rejected as far more error-prone for marginal correctness gain at this tiny scale.
- **Goal-margin enumeration via monotonicity boundaries.** Top-2 qualification is monotonic in a team's own goal difference: a larger winning margin (or smaller losing margin) never worsens its standing. So instead of enumerating unbounded scorelines, enumerate W/D/L per remaining match and, where a tiebreak is margin-sensitive, evaluate only the **boundary margins** — the smallest decisive margin (e.g. a 1-goal win) and a saturating large margin that maximizes the GD/goals-for swing. If a team qualifies under its worst admissible boundary it is `clinched`; if only under some boundary it is `alive`; if under none it is `eliminated`. This makes enumeration finite, small, and provably complete for the classification question without sampling. Alternative: enumerate every plausible scoreline — rejected as unnecessary given monotonicity; analytic inequalities — rejected as more error-prone for marginal gain.
- **Head-to-head as a recursive sub-standings.** When teams tie on the all-matches criteria, build a mini-table from only their mutual matches and re-apply the same comparator; if still tied, fall to fair-play then a deterministic lots seed. Alternative: flat comparator — rejected, would misorder real head-to-head cases.
- **Deterministic "lots".** Seed the final tiebreak from a stable key (e.g. team id) so output is reproducible in tests; real drawing-of-lots is out of scope and flagged where it would apply.
- **Verdict separates top-2 from third-place.** `clinched`/`eliminated`/`alive` describe top-2 only; third-place eligibility is a separate flag so the probabilistic layer can own cross-group resolution without this layer ever emitting a false `eliminated`.
- **Module layout:** `lib/engine/standings.ts`, `lib/engine/verdict.ts`, shared `lib/engine/types.ts`.

## Risks / Trade-offs

- **Tiebreaker correctness (esp. head-to-head)** → exhaustive unit tests built from constructed group states and the recorded live snapshot; encode each FIFA criterion as a discrete, tested comparator step.
- **Enumeration missing a margin that flips a tiebreak** → enumerate representative margins bounded by what can affect GD/goals-for among the group's teams, with tests on margin-sensitive cases.
- **Live fixtures mid-match** → standings default to completed-only; provisional mode is explicit and marked, so verdicts are not silently computed off non-final scores.
- **Combinatorial growth if more than 2 matches remain** → only relevant at earlier rounds; enumeration stays small for the final round (the live window). If needed for earlier rounds, cap via W/D/L-first enumeration then refine margins.

## Migration Plan

Greenfield; depends on `data-ingestion-layer` landing first. Land `lib/engine/` standings + verdict with unit tests against the recorded snapshot. No runtime deps.

## Open Questions

- Whether to expose the full enumerated outcome set or only the summarized required/eliminating conditions — lean summarized for the LLM, with the raw set available for tests.
