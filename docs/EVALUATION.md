# Evaluation — why you can trust the numbers and answers

This document explains how the Bracket Analyst's outputs are kept correct, grounded, and
honest, and — just as importantly — what it does **not** claim. The product's whole value rests
on being a *grounded* advisor, so this is the contract behind that promise.

## What we evaluate

1. **Correctness of the math** — standings, qualification verdicts, third-place selection, and
   the knockout odds compute what FIFA's rules and the model define.
2. **Grounding of the answers** — every figure the Analyst states comes from the engine, never
   from the model's imagination.
3. **Honesty of the framing** — the app doesn't overstate certainty, dress up a low/odd metric
   as a verdict, or hide its limitations.

## The model

Probabilities come from a single, consistent chain — not opinions:

- **Elo strength → Poisson goals.** Each team's committed Elo rating is converted to a Poisson
  scoring strength; a match is modelled as independent Poisson goals per side (with a
  host-only home-advantage term).
- **Monte Carlo over what's left.** Remaining group fixtures (and the knockout tree) are
  simulated many times; group tables and the best-8-of-12 third-placed selection are recomputed
  each trial. This is the only sound way to reason about a third-placed team's fate, which
  depends on results in eleven *other* groups.
- **Live-conditioned ("as it stands").** In-progress matches are seeded from the current
  scoreline; only the remaining goals are sampled. Decided knockout matches are locked to the
  real winner.
- **One head-to-head, shared.** The probability shown next to a bracket pick and the number the
  Analyst gives for the same pairing come from the *same* matchup model, so the bracket and the
  chat never disagree, and both are consistent with the aggregate Monte Carlo.

Deterministic outcomes are pinned, not sampled: a clinched team is 1.0, an eliminated team is
0.0 — no simulation noise on facts.

## Test strategy

- **Pure engine, exhaustively unit-tested.** The engine is framework-agnostic and tested over a
  **committed data snapshot** (`lib/data/__fixtures__/`), so results are deterministic and CI
  doesn't depend on the live feed. The suite is ~300 tests across the data, engine, grounding,
  Analyst-tools, and API layers.
- **Spec-first.** Every behaviour is described in an OpenSpec spec before it's built
  (`openspec/specs/`), and changes are validated against those specs.
- **Live smoke tests, gated.** A data smoke test hits the real FIFA endpoints (skippable with
  `SKIP_LIVE=1`); an Analyst smoke test runs only when `ANTHROPIC_API_KEY` is set. Neither is
  required for the core suite.
- **Determinism aids.** Seeded RNG and common-random-numbers make Monte-Carlo-based features
  (odds, pool-finish, the leverage generator) reproducible and comparable.

## Grounding guarantees

- **Tools are the only source of figures.** The Analyst calls grounded tools and phrases their
  output; it never computes a number itself.
- **It declines rather than invents.** If a tool didn't return a value, the Analyst says it
  doesn't have it.
- **Constructive but honest tracking.** A bracket is called busted/eliminated only when picks are
  *actually* busted or wrong; a low perfect-bracket chance or an early points tally is never
  presented as elimination. Picks are referred to by team and round, not internal ids.
- **History is color, not a model input.** World Cup history and current-tournament scorers are
  used for context only; they never produce or change a 2026 probability, projected finish, or
  pick.

## Data provenance & coverage

- **Live tournament data** comes from FIFA's undocumented public JSON (fixtures + results + goal
  events, squads, players). See [DATA.md](DATA.md).
- **Team strength** is a committed Elo ratings snapshot (`lib/data/ratings.json`).
- **World Cup history** is a committed dataset parsed from RSSSF, covering **1930–2022 only** —
  it explicitly excludes the in-progress tournament. The per-tournament Golden Boots and the
  all-time top-scorer list are curated; the live all-time scoring record is computed by adding
  2026 goals to that through-2022 base.

## Limitations / what is *not* claimed

- **Not a betting product.** The odds are a transparent model for *decision support*, not a
  guarantee or a betting edge. Single-match upsets happen by design.
- **Ratings are a snapshot.** Strength comes from a fixed Elo snapshot, not a continuously
  updated rating service.
- **No player-form modelling.** Goalscorers are surfaced as color; player form does **not** feed
  the prediction model.
- **Live modelling is approximate.** The feed carries no match minute, so live-conditioning
  samples a fixed expected number of remaining goals rather than time-scaling — a documented,
  swappable choice.
- **History coverage is bounded.** The committed dataset covers ~99% of matches 1930–2022 with a
  small, documented residual of obscure replay/playoff edge matches omitted, and ends at 2022.
- **It's an advisor, not an oracle or a host.** It helps you decide and understand; it doesn't
  run your pool or promise outcomes.
