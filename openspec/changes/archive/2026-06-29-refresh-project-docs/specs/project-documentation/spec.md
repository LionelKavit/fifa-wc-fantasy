## ADDED Requirements

### Requirement: README presents the current product in a product-manager voice

The repository README SHALL describe the product as it ships today — the **FIFA World Cup
2026 Bracket Analyst** — and SHALL be written for a non-technical audience (a client/user
pitch), leading with the user's need and the value delivered before any implementation
detail. It SHALL state who it is for (casual bracket-pool players), the two moments of need
(filling the bracket before the deadline, and tracking it during the tournament), and the
core value (pick guidance, pool-winning strategy / "You vs. the Model", grounded Elo-based
expertise explained in plain English, demystifying the 48-team format, and live engagement).
It SHALL make the positioning explicit — an **advisor**, not a pool host — and SHALL preserve
the unofficial-hobby, original-styling, and not-affiliated-with-FIFA disclaimers, plus a
concise quick-start (including the key-less deterministic mode vs. the conversational
Analyst). Technical detail MAY appear, but only in support of the value, never as the lead.

#### Scenario: README leads with need and value

- **WHEN** a non-technical reader opens the README
- **THEN** the opening conveys who it's for, the problem it solves, and the value delivered, in plain English, before any architecture or tech-stack detail

#### Scenario: README reflects the shipped product

- **WHEN** the README describes features
- **THEN** it covers the group dashboard, the Bracket Predictor (fill → strategize → lock → export), and the Analyst chat — under the current "Bracket Analyst" branding — and does not describe the product as a group-stage-only "Pocket Scout"

#### Scenario: Positioning and disclaimers preserved

- **WHEN** the README frames what the product is
- **THEN** it states it is an advisor (not a pool host) and keeps the unofficial-hobby, original-styling, and not-affiliated disclaimers

### Requirement: Architecture document is current and accurate

`docs/ARCHITECTURE.md` SHALL describe the system as it is built today, across its layers:
data ingestion (fetch/validate/normalize, goal events, and the committed World Cup history
dataset), the pure engine (group-stage standings/verdicts/scenarios/third-place/Monte-Carlo
**and** the knockout pipeline — bracket build, projected Round of 32, the Elo-strength Poisson
head-to-head model, prediction scoring and model comparison, the pool-finish simulation, the
heuristic and leverage bracket generators, per-match decided-result locking, and the
current-scorers / history aggregates), the grounding layer, the Analyst (its grounded tool
surface and persona discipline), the server provider, and the Next.js surfaces. It SHALL state
that the engine is pure, framework-agnostic, and tested, and that probabilities come from the
Elo-strength Monte-Carlo model (live-conditioned).

#### Scenario: Architecture covers the knockout half

- **WHEN** a reader consults the architecture doc
- **THEN** it documents the bracket-predictor pipeline (build, projected R32, head-to-head model, scoring/comparison, pool-finish simulation, generators, decided locking) in addition to the group-stage engine

#### Scenario: Architecture matches the code layers

- **WHEN** the doc lists the layers and key modules
- **THEN** they correspond to the actual `lib/` structure (data, engine, grounding, scout/Analyst, server) and the `app/` surfaces

### Requirement: Evaluation document explains trustworthiness

The repository SHALL include `docs/EVALUATION.md` that explains how the product's correctness
and trustworthiness are evaluated: the probability model's basis (Elo strength → Poisson →
Monte-Carlo, live-conditioned) and the single head-to-head model shared by the bracket and the
Analyst; the test strategy (pure engine tests over a committed snapshot, with the suite size,
and env-gated live smoke tests); the grounding guarantees (tools are the only source of
figures, the Analyst declines rather than fabricating, and tracker answers stay constructive
but honest); the data provenance and coverage (live FIFA feed; RSSSF World Cup history through
2022, excluding the in-progress tournament); and an honest list of limitations and claims the
product does **not** make.

#### Scenario: Evaluation covers model, tests, grounding, and limits

- **WHEN** a reader opens the evaluation doc
- **THEN** it describes the model basis, the testing approach, the grounding guarantees, the data provenance/coverage, and explicit limitations / non-claims

#### Scenario: Evaluation is honest about scope

- **WHEN** the evaluation doc states what is validated
- **THEN** it distinguishes what is tested/grounded from what is not claimed (e.g. it is not a betting product; ratings are a snapshot; no player-form modelling)

### Requirement: Screenshots are current and documented

The screenshots embedded in the docs SHALL reflect the current UI and branding, and
`docs/images/README.md` SHALL list exactly which screenshots are needed and what each should
capture. Stale images that show the old "Scout"/group-stage-only product SHALL be replaced.
Screenshots SHALL use original styling only (no FIFA marks).

#### Scenario: Screenshot manifest matches the docs

- **WHEN** the docs reference screenshots
- **THEN** each referenced image exists, shows the current UI/branding, and is described in `docs/images/README.md` with capture guidance

#### Scenario: No stale product imagery

- **WHEN** the docs render their images
- **THEN** none depict the superseded "Pocket Scout" group-stage-only product or the old "Scout" naming
