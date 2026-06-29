# Architecture

The Bracket Analyst is a **layered pipeline**. Each layer is a pure(ish) module that consumes
the layer below and is independently tested. The "brain" (data → engine → grounding → analyst)
is framework-agnostic TypeScript under `lib/`; the Next.js app under `app/` is a thin
presentation + transport shell on top.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Next.js app (app/)                                                          │
│   one page, two tabs:  Knockouts (Bracket Predictor) · Group stage (dashboard)│
│   persistent "Ask the Analyst" chat · /api routes                            │
└───────────────▲───────────────────────────────────────▲─────────────────────┘
                │                                         │
┌───────────────┴──────────┐               ┌─────────────┴─────────────────────┐
│  server/ (provider)       │               │  scout/ (the Analyst — LLM agent)  │
│  cached snapshot+report;  │               │  grounded tools → tool-use loop →  │
│  builds the outcome model,│               │  answer · keyless deterministic    │
│  odds, bracket, generators│               │  fallback                          │
└───────────────▲──────────┘               └─────────────▲─────────────────────┘
                │                                         │
        ┌───────┴─────────────────────────────────────────┴───────┐
        │  grounding/   per-team / per-group "situations" + plain-English narration │
        └───────────────────────────▲─────────────────────────────┘
                                    │
        ┌───────────────────────────┴─────────────────────────────┐
        │  engine/  (pure math, no I/O)                            │
        │  group stage: standings · verdict · scenarios ·         │
        │     thirdPlace · montecarlo · probability · live        │
        │  knockouts: bracket · projectedR32 · knockoutProbability │
        │     · matchup head-to-head · predictionScore ·          │
        │     predictionVsModel · poolFinish · bracketGenerator + │
        │     leverageGenerator · prediction (decided locking)    │
        │  reference: worldCupHistory · currentScorers            │
        └───────────────────────────▲─────────────────────────────┘
                                    │
        ┌───────────────────────────┴─────────────────────────────┐
        │  data/   fetch + cache + validate + normalize →          │
        │          TournamentSnapshot (+ committed history dataset)│
        └───────────────────────────▲─────────────────────────────┘
                                    │
                   FIFA public JSON (undocumented) + RSSSF history (committed)
```

## Layers

### `lib/data` — ingestion
Fetches the three public FIFA endpoints (`players.json`, `squads.json`, `rounds.json`) with a
short-TTL cache, validates each against a tolerant **zod** schema (accepts additive drift,
fails loud on missing/retyped fields we depend on), and **normalizes** into typed domain models
— `Team`, `Group`, `Player`, `Round`, `Fixture` — exposed via a single
`loadTournamentSnapshot()`. Each fixture also carries its **goal events** (`GoalEvent`:
scorer, assister, own-goal flag) when the feed provides them. Raw shapes never leak past this
layer. The committed **World Cup history dataset** (`lib/data/world-cup-history.json`, 1930–2022,
from RSSSF) is a separate static input, loaded but never fetched at runtime. See
**[DATA.md](DATA.md)** for the endpoints, the key join finding, and the history dataset.

### `lib/engine` — the math (pure, no I/O)

**Group stage — deterministic:**
- `standings.ts` — group tables under FIFA criteria: points → goal difference → goals scored →
  **head-to-head among tied teams** → fair-play (unavailable in the feed → no-op) → drawing of
  lots (deterministic by team id). A `provisional` mode folds an in-progress scoreline.
- `scenarios.ts` — enumerates remaining-fixture outcomes. Because top-2 qualification is
  **monotonic in a team's own goal difference**, it evaluates margin-sensitive tiebreaks only at
  **boundary margins** — finite, small, and provably complete for classification.
- `verdict.ts` — classifies each team `clinched` / `alive` / `eliminated` for the top 2, derives
  what an alive team needs, and **hands off** third-place-only teams to the probabilistic layer.

**Group stage — probabilistic (Monte Carlo):**
- `outcome.ts` + `rng.ts` — a seedable PRNG and an injectable **Poisson** scoreline model.
- `thirdPlace.ts` / `thirdPlaceAllocation.ts` — the deterministic **best-8-of-12** third-placed
  selection and its Annex-C bracket allocation.
- `montecarlo.ts` — each trial samples every remaining fixture, recomputes all 12 group tables,
  and runs the best-8 selection (the only way to reason about a third-placed team's fate, since
  it depends on 11 *other* groups). **Live** fixtures are seeded from their current scoreline.
- `probability.ts` — per-team advancement probability, with `clinched → 1.0` / `eliminated → 0.0`
  pinned deterministically, plus a conditional split (X% if you win / draw / lose).
- `live.ts` — detects in-progress fixtures.

**Knockouts — the bracket pipeline:**
- `strength.ts` — converts the committed Elo ratings into per-team Poisson **strength**
  multipliers (the model input).
- `bracket.ts` — builds the knockout tree (Round of 32 → Final) from the qualified/seeded teams;
  `projectedR32` fills undetermined slots with the model's projected qualifiers so the bracket is
  legible before the real draw is set.
- `knockoutProbability.ts` — per-team reach/win odds (reach R16/QF/SF/Final, champion) via
  Monte Carlo over the bracket using the strength model.
- The single **matchup head-to-head** model (Poisson, shared) gives `P(a beats b)` for a
  specific pairing — the same number the bracket card and the Analyst's comparison report.
- `prediction.ts` — the user's picks as a `Prediction`, plus **per-match decided locking**:
  once a match's real result is in, it is fixed to the real winner (`withDecided`,
  `decidedWinners`); live/undecided matches stay editable.
- `predictionScore.ts` — scores a bracket against reality (per-pick status
  pending/correct/wrong/busted; round-weighted points; upset bonus).
- `predictionVsModel.ts` — the "You vs. the Model" comparison: each pick's head-to-head vs its
  predicted opponent, marginal reach, boldness (head-to-head underdog count), and upset payoff.
- `poolFinish.ts` — simulates how a complete bracket places in a pool of N (win probability,
  finish distribution), the basis of pool-winning strategy.
- `bracketGenerator.ts` — the fast **heuristic** autofill: chalk plus a boldness budget tuned to
  risk + pool size; completes from whatever the user has already picked.
- `leverageGenerator.ts` — the heavier **leverage** strategy: a beam search over single-flip and
  composite "ride a dark horse" moves that directly maximizes pool-win probability via
  `poolFinish`, under common random numbers.

**Reference data (Analyst color, never prediction inputs):**
- `worldCupHistory.ts` — pure aggregates over the committed 1930–2022 dataset (a nation's record,
  head-to-heads, champions, Golden Boots / all-time scorers; West Germany folded into Germany).
- `currentScorers.ts` — the live 2026 Golden Boot race from fixture goal events, and the live
  all-time scoring record (history-through-2022 + 2026 goals).

### `lib/grounding` — facts + narration (pure, no LLM)
Joins the deterministic verdict and the probabilistic report into one structured
`TeamSituation` / `GroupSituation` with a deterministic plain-English **narration** whose every
claim maps to a field — so the Analyst can phrase facts but never invent them. Doubles as the
**keyless fallback** explainer.

### `lib/scout` — the Analyst (LLM agent)
A tool-use loop (`claude-sonnet-4-6`, thinking off + low effort for cost) where the model calls
**grounded tools** and composes a short answer. The tool surface spans all three needs:
group-stage (`get_team_situation`, `get_group_situation`), bracket/tracker
(`evaluate_bracket`, `bracket_strategy`, `compare_teams`), reference color
(`get_expert_notes`, `get_wc_record`, `get_wc_head_to_head`, `get_wc_top_scorers`,
`get_wc_champions`, `get_current_top_scorers`, `get_wc_scoring_record`). Key properties:
- **Grounded** — every number comes from a tool result; the model phrases, it doesn't compute,
  and it declines rather than fabricating.
- **Disciplined persona** — brief plain text, no process/tool narration; constructive-but-honest
  tracker answers (a bracket is "busted" only when picks are actually busted/wrong); picks are
  referred to by team and round, never internal match ids; history/scorers are color only and
  never alter a 2026 probability.
- **Keyless fallback** — with no `ANTHROPIC_API_KEY`, it answers from the grounding narration.
- **Token-efficient & streaming** — compact tool results, prompt-prefix caching, multi-turn.

### `lib/server` — provider
A server-only cache in front of the engine: loads the snapshot, builds the **Elo-strength
outcome model**, computes the Monte Carlo report, bracket, per-team odds, and the head-to-head
function **once**, and serves them with a TTL — **60s normally, shorter while a match is live**
— so the heavy simulation never runs on the request hot path. It also hosts the bracket
**generators** (`generatePrediction` with `heuristic` | `leverage` strategy) and the
**evaluation/strategy** helpers the predictor and the Analyst share.

### `app/` — Next.js
- **One page, two tabs** (`AppShell`): **Knockouts** (the `BracketPredictor` + `BracketVerdict`
  settings/build box, default) and **Group stage** (the server-rendered dashboard of
  `GroupCard`s). The **Ask the Analyst** chat (`ScoutChat`) is persistent across both tabs and
  sends bracket context on the Knockouts tab. `LiveRefresher` refreshes in place only while a
  match is live.
- **API routes** — `GET /api/groups`, `GET /api/groups/[id]`, `GET /api/bracket`,
  `POST /api/predictor/evaluate`, `POST /api/predictor/generate`,
  `POST /api/predictor/pool-finish`, `POST /api/predictor/verdict-note`,
  `POST /api/chat` (streaming Analyst), and `GET /api/share` (the share card). The Anthropic key
  is read **server-side only**.

## Cross-cutting decisions

- **Framework-agnostic core.** The engine has zero dependency on Next.js; the web layer is a
  swappable shell.
- **One probability source.** The bracket card and the Analyst draw the same head-to-head from
  the single matchup model, so they never disagree for the same pairing; aggregate odds come from
  the same Monte Carlo.
- **Determinism where it's deterministic.** Clinched/eliminated are pinned to 1.0/0.0; decided
  knockout matches are locked to the real winner; only genuinely contested fates are simulated.
- **No fabricated numbers.** Grounding/tools are the single source of truth the Analyst draws
  from.
- **History is color, not a model input.** World Cup history and current scorers never produce or
  alter a 2026 probability, finish, or pick.
- **Spec-first.** Every behavior was specified in OpenSpec before implementation
  (`openspec/specs/`, history in `openspec/changes/archive/`).
- **Live modeling is approximate.** The feed carries no match minute, so live-conditioning
  samples a fixed expected number of remaining goals rather than time-scaling — a documented,
  swappable choice.
