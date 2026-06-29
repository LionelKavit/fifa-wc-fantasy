# Refresh the project docs for the Bracket Analyst

## Why

The docs still describe the original app — "Pocket Scout", a **group-stage qualification
engine** with a "Scout" chat. The product has since become the **FIFA World Cup 2026 Bracket
Analyst**: a grounded bracket *advisor* for casual pool players, with a knockout Bracket
Predictor, pool-winning strategy ("You vs. the Model"), an Elo-strength Monte-Carlo model, a
constructive Analyst, World Cup history, and live current-tournament scorers. The README,
architecture doc, and screenshots are all stale and undersell what the product does. There is
also no document that explains how we know the numbers and answers can be trusted.

The README in particular reads like an engineering changelog; for a hobby project meant to be
shown to friends and potential users, it should read like a **product manager presenting to
clients** — leading with the user's need and the value delivered, not the tech.

## What changes

This change specifies (implementation later) a refresh of three docs plus the screenshots:

- **README** — rewritten in a product-manager voice that bridges *need → value*: who it's
  for, the two moments of need (fill-before-deadline Advisor, in-tournament Tracker), the core
  value (pick guidance, pool-winning strategy, grounded Elo expertise, demystifying the
  48-team format, live engagement), and the grounding promise (never invents numbers) — with
  the current branding, surfaces, and an honest "what it is / isn't" framing. Keep the
  unofficial-hobby + original-styling disclaimers and a concise quick-start.
- **Architecture** (`docs/ARCHITECTURE.md`) — updated to the current system: the data layer
  (incl. goal events + the committed World Cup history dataset), the engine (standings/
  verdicts/Monte Carlo **and** the knockout pipeline: bracket build, projected R32,
  Elo-strength Poisson head-to-head, scoring/model-comparison, pool-finish simulation, the
  heuristic + leverage generators, per-match decided locking), the grounding layer, the
  Analyst (tools incl. history/current-scorers, persona discipline), the server provider, and
  the Next.js surfaces.
- **Evaluation** (`docs/EVALUATION.md`, new) — how correctness and trustworthiness are
  evaluated: the probability model's basis and live-conditioning, the test strategy (pure
  engine tests over a committed snapshot), the grounding guarantees (tools are the source of
  truth; the Analyst never fabricates), data provenance/coverage, and an honest list of
  limitations and what is explicitly *not* claimed.
- **Screenshots** — replace the stale images with current ones and update
  `docs/images/README.md` to list exactly what to capture. The concrete shot list (provided
  by the user) is defined in this change's design.

## Impact

- Affected spec: new `project-documentation` capability (documentation requirements).
- Affected files (implementation later): `README.md`, `docs/ARCHITECTURE.md`,
  `docs/EVALUATION.md` (new), `docs/DATA.md` (touch-ups), `docs/images/*`.
- No code, engine, or product-behavior change — docs only.

## Out of scope

- Any product/code behavior change.
- Marketing site or external publishing; this is the in-repo docs only.
