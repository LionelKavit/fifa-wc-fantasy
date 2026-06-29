## 1. Beam search core (engine)

- [x] 1.1 In `lib/engine/leverageGenerator.ts`, replace the single-`current` hill-climb loop with a beam: an array of states, each a `selected` set plus its cached search-trial win estimate. Add a canonical state key (sorted match-id list of `selected`) for deduplication and tie-breaking.
- [x] 1.2 Seed the beam with the heuristic-derived `selected` (or chalk when no seed) **and** the chalk (empty) set, deduplicated.
- [x] 1.3 Add a `beamWidth` option (default small, e.g. 4) to `LeverageGenerateOptions`; `beamWidth = 1` MUST reproduce the current hill-climb behaviour.

## 2. Round expansion + selection

- [x] 2.1 Each round: for every beam member, enumerate all candidate moves (single flips + composite path moves from leverage-path-aware-moves), form child `selected` sets, and `buildFromSelected` for feasibility.
- [x] 2.2 Score each child with `evalWin(..., searchTrials)` under the shared seed (common random numbers). Collect parents + children, deduplicate by canonical key, and keep the top-`W` by estimate (stable tie-break on the key).
- [x] 2.3 Track the global best state; stop when a full round yields no child improving the best by > epsilon, or the round budget is hit.
- [x] 2.4 Final selection: re-evaluate the best beam state and the heuristic seed at `finalTrials` and return the better (seed wins ties) — the existing floor gate, unchanged in spirit.

## 3. Server (optional wiring)

- [x] 3.1 Optionally pass a risk-scaled `beamWidth` from `lib/server/predictor.ts` (mirroring `LEVERAGE_MAX_FLIPS`); no route or UI change. If not wired, the engine default applies.

## 4. Tests

- [x] 4.1 Engine (inject a synthetic evaluator with a "valley": the optimum requires a step that is not the single greedy best): a beam of width > 1 reaches a bracket the width-1 hill-climb misses (beam estimate ≥ hill-climb estimate).
- [x] 4.2 Engine: `beamWidth = 1` produces the identical bracket to the pre-beam hill-climb for the same inputs/seed (equivalence guard).
- [x] 4.3 Engine: the floor gate still guarantees ≥ heuristic seed at full trials; determinism (same inputs+seed → identical picks, relying on stable tie-breaking); bounded evaluations (assert a cap ≈ `W × candidates × rounds` + final evals).

## 5. Verify

- [x] 5.1 Verified in preview (balanced, seed 1): "Optimize ≥ Build" everywhere — pool 4 34.94% vs 34.87% (+0.07), pool 20 8.64% vs 3.78% (+4.86), pool 40 4.14% vs 1.45% (+2.69, chalk 1.29%). Latency ≈4 s / 9 s / 21 s for pools 4 / 20 / 40 with the tuned beam (W `{2,2,3}`, rounds `{3,4,5}`, 150 search trials), under the 30 s ceiling. No console/server errors.

## 6. Spec sync

- [x] 6.1 Implementation matches the MODIFIED "Seeded win-probability maximization" and "Common random numbers and bounded cost" requirements and the ADDED "Beam search over candidate brackets" requirement in `specs/leverage-generation/spec.md` (delta to be synced into the main spec at archive time).
