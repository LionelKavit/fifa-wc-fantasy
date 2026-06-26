# Pocket Scout — project context for Claude

Read this first. It captures *what we're building and for whom* so design and code
decisions stay aligned with the product. Keep it updated as the product evolves.

## Who it's for

People who play **bracket tournaments / prediction pools** among friends, family, and
coworkers — mostly **casual fans**, not analysts. They fill out a bracket for a pool
hosted somewhere else (an office sheet, ESPN, a group chat) and want to do well in it.

## How they behave (two moments of need)

A casual bracket player has two moments of need:

1. **Before the deadline** — *"Help me fill this out without looking clueless (and maybe win)."*
2. **During the tournament** — *"What's happening to my bracket, and is it still alive?"*

They're casual fans. They don't know who Cape Verde is, they agonize for 20 minutes, they
copy a friend or pick by flag/vibes, and they secretly want to beat their group. **The app
is the expert friend they text for advice. That's the whole value.**

Design implication: the two moments map to the two product surfaces — the **Advisor**
(pre-deadline: fill → strategize with the Scout → lock → export) and the **Tracker**
(in-tournament: saved bracket scored vs reality, "did it survive?").

## What the product IS

A **bracket-expert companion** in the *knowledge domain* — think "an expert friend in
your corner" who knows every team, runs the numbers, and gives plain-English advice.
It helps users **decide their picks before they submit** and **understand the tournament
as it unfolds**. The current build is on the FIFA World Cup 2026.

## What the product is NOT

- **Not a host.** We do NOT run the pools, store other players' brackets, or own a
  leaderboard. Users play their pool elsewhere; we're the advisor they consult.
- Not a generic stats dashboard or a betting product.

Implication: features should deliver **decision support and understanding**, not
pool-hosting mechanics. "Score your bracket" is a personal tracker/what-if tool, not a
multiplayer competition we operate.

## Core value we deliver to a bracket player

1. **Pick guidance** — projected score, per-pick odds, "is this favourite safe / is this
   upset worth it?" A coach for filling the bracket.
2. **Pool-winning strategy ("You vs. the Model")** — winning a small pool isn't about raw
   accuracy, it's about *smart differentiation*. We quantify boldness vs. chalk and the
   contrarian/upset payoff so users can calibrate risk to actually beat their friends.
3. **Grounded expertise** — real Elo-based probabilities (not vibes), explained in plain
   English by the Scout. Never makes up numbers.
4. **Demystifying the format** — the confusing 48-team / best-third-placed / Annex C
   bracket: who plays whom, and a projected R32 so users can plan early.
5. **Live engagement** — track a bracket's fate as games happen (survival %, what's still
   alive, what busted).

## How that maps to what's built (high level)

- **One unified Scout**: a *single* chat endpoint + agent answers across all three needs
  (group stage, bracket advice, tracker) by choosing from a shared toolset (its "knowledge
  sources"); the user's current/saved picks + pool size are passed as context when
  available. Do NOT fork per-feature chat endpoints — add tools, not endpoints.
- Group-stage qualification engine + dashboard + **Scout** chat (the original app).
- **Bracket Predictor** (`/predictor`): fill the knockout bracket, see projected score &
  survival, boldness, upset bonus — the pick-advisor surface.
- Engine is pure, tested TypeScript; probabilities come from a Monte Carlo over an
  **Elo-strength** Poisson model. See `docs/ARCHITECTURE.md` and `docs/DATA.md`.

## Working conventions (also see memory + OpenSpec)

- **Spec-first**: every behaviour change updates the OpenSpec specs (`openspec/`), not
  just code. Implement via the OpenSpec workflow.
- Engine core stays pure/framework-agnostic and tested; the web app is a thin shell.
- Original styling only — no FIFA logos/imagery; unofficial hobby project.
