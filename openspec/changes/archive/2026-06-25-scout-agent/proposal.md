## Why

The engine and grounding layers know exactly what every team needs and its odds — but a fan asks in natural language ("what does the USA need?", "who should I root for tonight?", "is this match a dead rubber?"). The Scout is the conversational agent that answers those questions, grounded in the engine so it never invents a number. This is the product's face: the thing a scoreboard can't do.

## What Changes

- Add an LLM agent ("the Scout") using the Anthropic SDK (`@anthropic-ai/sdk`) and model `claude-sonnet-4-6` with adaptive thinking, that answers free-form World Cup qualification questions.
- Define a small set of engine-backed **tools** the model can call — e.g. resolve a team by name, get a team/group situation, get advancement probabilities — each implemented by the grounding layer over a `TournamentSnapshot`. The model never receives raw floats it could miscompute; it requests grounded facts via tools.
- Run a tool-use loop (manual loop or SDK tool runner) so the Scout fetches the facts it needs, then answers; responses **stream** to the chat UI.
- Add a Scout persona/system prompt: a concise, knowledgeable World Cup analyst that explains scenarios plainly, distinguishes certainty from probability, and stays scoped to the tournament.
- Ground every numeric/qualification claim in tool output; if asked something the engine can't answer, the Scout says so rather than guessing.
- Add a **no-API-key fallback**: when no Anthropic key is configured, the Scout answers directly from the deterministic grounded narration (resolving the team or group named in the question) instead of calling the LLM, so the app is useful offline/keyless. The answer indicates it came from the deterministic fallback.
- Keep the Anthropic API key server-side only (never committed, never sent to the client).

## Capabilities

### New Capabilities

- `scout-tools` — engine/grounding-backed tool definitions and their execution, callable by the model.
- `scout-conversation` — the Scout persona, the grounded tool-use conversation loop, and streaming responses.

### Modified Capabilities

None.

## Impact

- New code under `lib/scout/` (tools, system prompt, conversation runner). Depends on `scenario-grounding` and the engine/data layers.
- New dependency: `@anthropic-ai/sdk`. New env var `ANTHROPIC_API_KEY` (server-side only).
- This is the Claude API + tool-use tier (we host compute; tools are pure local functions) — not Managed Agents.
- Consumed by the UI/API change that follows (a chat endpoint). No public per-user team auth involved.
