## 1. Strategy engine

- [x] 1.1 Add `lib/engine/bracketStrategy.ts`: pure `analyzeStrategy(prediction, comparison, poolSize)` → pool-fit assessment + ranked swap suggestions; export from `lib/engine/index.ts`.
- [x] 1.2 Pool-fit: map pool size → target bold-pick band (monotonic: bigger pool → more boldness); classify too-safe / balanced / too-risky.
- [x] 1.3 Swaps: for too-safe, rank favourite→underdog upgrades by differentiation value; for too-risky, rank bold→favourite reversions; attach grounded rationale (model probs + expected/upset delta); only valid participants; bounded set.

## 2. Scout tool + conversation

- [x] 2.1 Add a `bracketStrategy` Scout tool (schema-validated picks + poolSize) wrapping the engine over `compareToModel`; handle missing picks/pool size as a clear result.
- [x] 2.2 Register it and add the strategic-advice behaviour to the prompt: concrete recommendation (assessment + 1–2 swaps), grounded; ask for missing inputs.

## 3. Tests (Vitest)

- [x] 3.1 Assessment: a chalk bracket in a large pool → "too safe"; an all-upset bracket in a small pool → "too risky"; deterministic.
- [x] 3.2 Swaps: too-safe → favourite→underdog suggestions (valid participants, with rationale); too-risky → reversions; bounded/ranked; balanced bracket → no forced swap.
- [x] 3.3 Tool executor: returns engine output; missing picks/pool size → clear result.

## 4. Spec sync

- [x] 4.1 Confirm implementation matches every scenario in `specs/bracket-strategy/spec.md`, `specs/scout-tools/spec.md`, and `specs/scout-conversation/spec.md`; keep code and specs in sync (note the pool-size→boldness mapping).
