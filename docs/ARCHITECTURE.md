# Architecture

Pocket Scout is a **layered pipeline**. Each layer is a pure(ish) module that consumes the layer below and is independently tested. The "brain" (data → engine → grounding → scout) is framework-agnostic TypeScript under `lib/`; the Next.js app under `app/` is a thin presentation + transport shell on top.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Next.js app (app/)                                                    │
│   • dashboard (server component)   • /api routes   • Scout chat (client)│
└───────────────▲───────────────────────────────▲───────────────────────┘
                │                                │
┌───────────────┴──────────┐      ┌──────────────┴───────────────────────┐
│  server/ (provider)       │      │  scout/ (LLM agent)                   │
│  cached snapshot+report   │      │  grounded tools → tool-use loop →     │
│  live-aware TTL           │      │  answer · keyless deterministic fallback│
└───────────────▲──────────┘      └──────────────▲───────────────────────┘
                │                                │
        ┌───────┴────────────────────────────────┴───────┐
        │  grounding/                                      │
        │  per-team / per-group "situations" + plain-English narration │
        └───────────────────────▲─────────────────────────┘
                                │
        ┌───────────────────────┴─────────────────────────┐
        │  engine/  (pure qualification math)              │
        │  standings · verdict · scenarios · thirdPlace ·  │
        │  montecarlo · probability · outcome · rng · live │
        └───────────────────────▲─────────────────────────┘
                                │
        ┌───────────────────────┴─────────────────────────┐
        │  data/   fetch + cache + validate + normalize    │
        │          → TournamentSnapshot                    │
        └───────────────────────▲─────────────────────────┘
                                │
                   FIFA public JSON (undocumented)
```

## Layers

### `lib/data` — ingestion
Fetches the three public FIFA endpoints (`players.json`, `squads.json`, `rounds.json`) with a short-TTL cache, validates each against a tolerant **zod** schema (accepts additive drift, fails loud on missing/retyped fields we depend on), and **normalizes** into typed domain models — `Team`, `Group`, `Player`, `Round`, `Fixture` — exposed via a single `loadTournamentSnapshot()`. Raw shapes never leak past this layer. See **[DATA.md](DATA.md)** for the endpoint details and the key join finding.

### `lib/engine` — the qualification math (pure, no I/O)
Two "layers" of logic:

**Deterministic** — exact, no probability:
- `standings.ts` — group tables under FIFA criteria: points → goal difference → goals scored → **head-to-head among tied teams** → fair-play (unavailable in the feed → no-op) → drawing of lots (deterministic by team id). A `provisional` mode folds an in-progress scoreline.
- `scenarios.ts` — enumerates remaining-fixture outcomes. Because top-2 qualification is **monotonic in a team's own goal difference**, it enumerates W/D/L and evaluates margin-sensitive tiebreaks only at **boundary margins** (smallest decisive + a saturating large one) — finite, small, and provably complete for classification.
- `verdict.ts` — classifies each team `clinched` / `alive` / `eliminated` for the top 2, derives what an alive team needs (win/draw/loss → clinch/depends/eliminated), and **hands off** third-place-only teams to the probabilistic layer (never falsely eliminating a team that can still finish 3rd).

**Probabilistic** — Monte Carlo for the cross-group question:
- `outcome.ts` + `rng.ts` — a seedable PRNG and an injectable **Poisson** scoreline model (independent Poisson per side, home-advantage term).
- `thirdPlace.ts` — the deterministic **best-8-of-12** third-placed selection under FIFA tiebreakers.
- `montecarlo.ts` — each trial samples every remaining fixture, recomputes all 12 group tables, and runs the best-8 selection. This is the only way to reason about a third-placed team's fate, since it depends on results in 11 *other* groups. **Live** fixtures are seeded from their current scoreline and only the remaining goals are sampled.
- `probability.ts` — per-team advancement probability, with `clinched → 1.0` / `eliminated → 0.0` **pinned deterministically** (no sampling noise), plus a conditional split (X% if you win / draw / lose).
- `live.ts` — detects in-progress fixtures.

### `lib/grounding` — facts + narration (pure, no LLM)
Joins the deterministic verdict and the probabilistic report into one structured `TeamSituation` / `GroupSituation`, and produces a deterministic plain-English **narration** whose every claim maps to a structured field — so the Scout can phrase facts but never invent them. A `provisional` option supports the live view. This layer doubles as the **keyless fallback** explainer.

### `lib/scout` — the LLM agent
A tool-use loop (`claude-sonnet-4-6`, thinking off + low effort for cost) where the model calls **grounded tools** (`get_team_situation`, `get_group_situation`) backed by the grounding layer, then composes a short answer. Key properties:
- **Grounded** — every number comes from a tool result; the model phrases, it doesn't compute.
- **Keyless fallback** — with no `ANTHROPIC_API_KEY`, it answers from the grounding narration directly (resolving the team/group named in the question), so the app is useful with zero setup.
- **Token-efficient** — brief plain-text answers, compact tool results, minimal tool surface, prompt-prefix caching, bounded `max_tokens`.
- **Multi-turn & streaming** — accepts prior turns; streams the answer.

### `lib/server` — provider
A server-only cache in front of the engine: loads the snapshot, computes the Monte Carlo report **once**, and serves both with a TTL — **60s normally, ~12s while any match is live** — so the heavy simulation never runs on the request hot path and the upstream feed isn't hammered.

### `app/` — Next.js
- **Dashboard** (`page.tsx`) is a **server component** that reads the provider directly (no client fetch waterfall) and renders group cards. `LiveRefresher` polls via `router.refresh()` **only while live**, updating in place (scroll + chat preserved).
- **API routes** — `GET /api/groups`, `GET /api/groups/[id]` (grounded data + live state), and `POST /api/chat` (streaming Scout, multi-turn, keyless fallback). The Anthropic key is read **server-side only**.
- **Components** — `GroupCard`, `ScoutChat` (client, streaming), `TeamButton` (detail dialog), `flags`, `teamResults`.

## Cross-cutting decisions

- **Framework-agnostic core.** The engine has zero dependency on Next.js; the web layer is a swappable shell.
- **Determinism where it's deterministic.** Clinched/eliminated are pinned to 1.0/0.0; only genuinely contested fates are simulated.
- **No fabricated numbers.** The grounding layer is the single source of truth the Scout draws from.
- **Spec-first.** Every behavior was specified in OpenSpec before implementation (`openspec/specs/`, history in `openspec/changes/archive/`).
- **Live modeling is approximate.** The feed carries no match minute, so live-conditioning samples a fixed expected number of remaining goals rather than time-scaling — a documented, swappable choice.
