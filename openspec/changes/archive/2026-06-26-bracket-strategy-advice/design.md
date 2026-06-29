## Context

`compareToModel` already returns, per pick: `modelProb` (marginal), `headToHead`, `bold`, `upsetBonus`, `expectedPoints`, plus the chalk bracket and `boldnessShare`. That's the raw material for strategy — we just need to turn it into a pool-fit judgement and concrete swaps, and surface it through the Scout. No new simulation.

## Goals / Non-Goals

**Goals:**
- A pure `bracket-strategy` function: pool-fit assessment + ranked swap suggestions with grounded rationale.
- A Scout tool + brief strategic-advice answers.

**Non-Goals:**
- New probability machinery (reuse `compareToModel`).
- A formal game-theoretic pool-win optimiser — a defensible heuristic is enough for v1.
- UI beyond the chat (the predictor already shows boldness/odds).

## Decisions

**1. Pool fit via a boldness target.**
Map pool size to a target number of bold (head-to-head underdog) picks — small pools → few/none (chalk usually wins), larger pools → progressively more (you must differentiate to top the field). Compare the bracket's actual bold count to the target band → "too safe", "well-balanced", or "too risky". The exact mapping is a small tunable table, pinned in implementation; the spec fixes only the monotonic direction (more pool → more boldness).

**2. Swap candidates ranked by marginal pool-edge improvement, using existing per-pick numbers.**
- *Too safe → add upside:* among favourite picks, rank by "differentiation value" — a high-upside underdog alternative in the same match (good `expectedPoints` with a meaningful `upsetBonus` if it hits) whose downside (lost expected base) is acceptable. Suggest the best 1–3.
- *Too risky → reduce variance:* among bold picks with poor risk/reward (long odds, low expected payoff), suggest reverting to the favourite.
Each suggestion carries the model probabilities and the expected/contrarian delta as rationale. Reuses `compareToModel` per-pick fields; the "alternative" for a match is the other current participant (or the match favourite).

**3. Reuse, don't re-simulate.**
The function takes the `compareToModel` result as input (the caller already has it), so the tool runs no extra Monte Carlo — it's arithmetic over per-pick numbers. Deterministic.

**4. Scout stays brief and grounded.**
The tool returns structured assessment + swaps; the Scout renders one or two as a short recommendation. Missing picks/pool size → ask, don't guess (consistent with the unified-Scout rules).

## Risks / Trade-offs

- **Heuristic, not optimal** → labelled as advice; the boldness-target table is tunable and the rationale is transparent (shows the numbers), so users can judge.
- **Swap realism** → only suggest valid participants of the affected match; for later rounds the "alternative" must be a coherent participant under the user's bracket (reuse `predictedParticipants`).
- **Pool-size edge cases** (size 1, huge) → clamp the target band; size ≤ 2 ⇒ essentially "play chalk".

## Open Questions

- The pool-size → boldness-target mapping (the table) — pinned in implementation against a few sample pool sizes.
- Whether to also suggest *champion* swaps specifically (highest-leverage pick) — likely yes as a special case; confirm in implementation.
