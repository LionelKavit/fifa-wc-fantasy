## Why

Reporting odds isn't advice. The product's whole value is the "expert friend" who says: *"Your bracket is 95% chalk — in a 10-person pool that rarely wins. Swap one safe QF pick for a live underdog; here are two with the best risk/reward."* That requires intelligence we don't have yet: assessing how a bracket fits a pool of a given size, and proposing concrete swaps. This change adds that strategic layer and exposes it through the one Scout.

## What Changes

- Add a **bracket-strategy analysis**: given a prediction, the model's evaluation, and a **pool size**, assess how chalk-vs-bold the bracket is and whether that fits the pool (small pools reward safety; large pools reward differentiation), and produce **ranked swap suggestions** — each a concrete "drop pick X, take Y instead" with a grounded rationale (the model's probabilities and the expected/contrarian impact).
- Expose it as a **Scout strategy tool**, so *"help me win my pool"* gets a specific recommendation, not just numbers.
- Have the **Scout give strategic advice** from that tool — a brief, concrete recommendation grounded in the analysis.

This is **engine + Scout + spec only**. It reuses the existing comparison output (per-pick odds, boldness, upset bonus, expected points, chalk bracket); it adds no new probability machinery and no endpoint.

## Capabilities

### New Capabilities
- `bracket-strategy`: pure analysis that, from a prediction + pool size + model evaluation, reports a chalk/bold assessment with pool-size fit and a ranked set of concrete swap suggestions with grounded rationale.

### Modified Capabilities
- `scout-tools`: add a strategy tool exposing `bracket-strategy` (schema-validated, engine-grounded).
- `scout-conversation`: the Scout SHALL answer "how do I win my pool?"-type questions with a concrete, grounded strategic recommendation (assessment + specific swap(s)).

## Impact

- **Engine** (`lib/engine/`, e.g. `bracketStrategy.ts`): a pure function over the prediction, the `compareToModel` result, and pool size → assessment + ranked swaps. Reuses per-pick `modelProb`/`headToHead`/`bold`/`upsetBonus`/`expectedPoints` and the chalk bracket; no new simulation.
- **Scout** (`lib/scout/`): one new tool + executor; system prompt note that strategic advice comes from this tool. Reuses the tool-use loop.
- **Depends on** `prediction-vs-model` (the evaluation) and `scout-bracket-tools` (the unified Scout + context plumbing that carries picks + pool size). No engine-probability changes, no new endpoint.
- **Pool size** is supplied via the chat context added in `scout-context-ui`.
