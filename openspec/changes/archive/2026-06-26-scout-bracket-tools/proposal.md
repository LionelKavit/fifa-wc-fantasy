## Why

The Scout is the product — "the expert friend you text for advice." Today it only knows the group stage. To serve the two moments of need (fill a bracket well; track it during the tournament), the **one** Scout must also answer bracket questions: *"I don't know these teams — who's better?"*, *"is this pick smart?"*, *"how's my bracket / did it survive?"* — all grounded in the engine. This change gives the single Scout the bracket knowledge sources (tools) and broadens its scope to cover all three needs. (It supersedes the earlier, narrower `predictor-scout-commentary`.)

## What Changes

- Add a **prediction-evaluation tool**: given the user's picks, return the grounded evaluation — per-pick status (pending/correct/wrong/busted) and model probability, projected (expected) score, survival per round, boldness, and upset bonus — from `bracket-prediction-scoring` + `prediction-model-comparison`. Handles "no picks provided" as a clear result.
- Add a **team-strength / head-to-head tool**: resolve teams by name and return Elo-based strength, the head-to-head win probability, and deep-run odds, so the Scout can answer "who's better, X or Y?" and "I don't know these teams" with grounded numbers.
- **Broaden the Scout's scope** from group-stage-only to the three needs — group-stage qualification, bracket advice, and tracking a saved bracket — choosing the right grounded tool per question, and answering bracket questions only when picks are in context (gracefully saying so when they aren't).

This is **Scout (tools + conversation) + spec only** — one agent, more knowledge sources. No new endpoint (the request context plumbing + UI is the sibling `scout-context-ui` change). No change to the prediction/odds engine.

## Capabilities

### New Capabilities
<!-- None; extends the existing Scout. -->

### Modified Capabilities
- `scout-tools`: add a prediction-evaluation tool and a team-strength/head-to-head tool, both engine-grounded and schema-validated.
- `scout-conversation`: broaden the persona/scope to cover group-stage, bracket-advice, and tracker questions over the shared toolset; add bracket-aware answering (explain a pick's odds, narrate survival / what busted), staying grounded and declining when the engine can't supply a fact.

## Impact

- **Scout layer** (`lib/scout/`): two new tool definitions + executors wired to `scorePrediction`, `compareToModel`, `knockoutProbabilities`, and the Elo strengths; system prompt broadened to the three domains. Reuses the existing tool-use loop and grounding discipline.
- **Depends on** the prediction/odds engine (`bracket-prediction-scoring`, `prediction-vs-model`, `knockout-advancement-odds`, `elo-strength-ratings`). No engine behaviour changes.
- **Input**: the user's picks + pool size reach the tools via the chat request context (added in `scout-context-ui`); this change defines the tools/behaviour that consume that context.
- **No** new endpoint and no change to existing group-stage answers (they keep working with no bracket context).
