# Design — docs refresh

## README — product-manager voice (need → value)

Structure the README so a non-technical reader (a friend, a pool-mate, a potential user)
immediately gets *what problem it solves and why it's good*, before any tech:

1. **One-line positioning** — "Your expert friend for filling out a World Cup bracket pool —
   and tracking it once the games start." Name it the *FIFA World Cup 2026 Bracket Analyst*.
2. **Who it's for & the need** — casual fans in a bracket pool (office sheet, ESPN, group
   chat) who want to do well without looking clueless. The two moments of need: *before the
   deadline* ("help me fill this out and maybe win") and *during the tournament* ("what's
   happening to my bracket — is it still alive?").
3. **The value (the heart)** — frame each as a benefit, with the mechanism in a clause:
   - **Pick guidance** — per-pick odds and a clear read on whether a favourite is safe or an
     upset is worth it.
   - **Pool-winning strategy ("You vs. the Model")** — winning a small pool is about *smart
     differentiation*, not raw accuracy; we quantify boldness vs. chalk and the upset payoff
     and calibrate risk to the pool size.
   - **Grounded expertise** — real Elo-based probabilities explained in plain English; the
     Analyst never makes up numbers.
   - **Demystifying the format** — the confusing 48-team / best-third-placed bracket, made
     legible, with a projected Round of 32.
   - **Live engagement** — track a bracket's fate as games happen.
4. **What it is / isn't** — an *advisor*, not a pool host: we don't run pools or store other
   players' brackets; you play your pool elsewhere and consult us.
5. **The surfaces** — Group dashboard, the Bracket Predictor (fill → strategize → lock →
   export), and the Analyst chat. Screenshots here.
6. **Quick start + the honest footer** — Node version, install/run, optional API key for the
   conversational Analyst (and that it works key-less via deterministic "Stats"), the
   unofficial-hobby + original-styling + not-affiliated disclaimers, spec-first note, license.

Tone: benefit-first, plain English, confident but honest; tech details are a supporting clause,
never the lead.

## Architecture doc — bring current

Keep the layered structure but update to today's system, adding the knockout half:
data (fetch/validate/normalize, goal events, committed WC-history dataset) → engine
(standings/verdicts/scenarios/third-place/Monte-Carlo **and** knockout: bracket build,
projected R32, Elo-strength Poisson head-to-head, prediction scoring + model comparison,
pool-finish simulation, heuristic + leverage generators, per-match decided locking,
current-scorers + WC-history aggregates) → grounding → Analyst (tool surface incl. history /
current scorers / scoring record, persona discipline) → server provider → Next.js surfaces
(dashboard + predictor + chat). Note the Elo-strength model basis and live-conditioning.

## Evaluation doc (new) — why the outputs can be trusted

Sections:
- **What we evaluate** — correctness of the math, grounding of the answers, honesty of the
  framing.
- **The model** — Elo strength → Poisson goals → Monte-Carlo over remaining fixtures;
  live-conditioned "as it stands"; the single head-to-head model the bracket and Analyst share.
- **Test strategy** — pure, framework-agnostic engine tests over a committed data snapshot;
  the full suite size; live smoke tests gated by env.
- **Grounding guarantees** — tools are the only source of figures; the Analyst declines rather
  than inventing; constructive-but-honest tracker framing (busted/wrong only when real).
- **Data provenance & coverage** — live FIFA feed; RSSSF World Cup history (through 2022,
  excludes the in-progress tournament); curated Golden Boots / all-time list.
- **Limitations / not claimed** — not a betting product; ratings are a snapshot; no
  player-form modelling; small-sample upsets, etc.

## Screenshot requirements (to be provided by the user)

Capture on a **wide desktop viewport (~1400px), dark theme, with a realistic completed/seeded
bracket** and no browser chrome. PNG. Original styling only (no FIFA marks — already the case).
Replace the stale `dashboard.png`, `scout-chat.png`, `team-dialog.png`.

1. **`predictor-hero.png` (hero)** — the full Bracket Predictor (Knockouts): the "Need help
   filling your bracket?" settings box, the bracket columns R32 → Final with per-pick
   head-to-head %, and the Analyst panel visible on the right. A complete bracket looks best.
2. **`analyst-bracket.png`** — a cropped close-up of the "Ask the Analyst" panel showing a
   strong bracket Q&A (e.g. "How's my bracket looking?" → the constructive read, and/or a
   "NED vs MAR" one-line verdict). This is the money shot for the advisor value.
3. **`group-dashboard.png`** — the group-stage dashboard: the 12 group cards with standings,
   per-team status (Through / In contention / 3rd-place race / Out) and Next Round %. If a
   match is live, the 🔴 LIVE badge is a bonus.
4. **`team-detail.png`** — a team detail dialog (e.g. a team's results + qualifying status), or
   a group detail, to show the per-team depth.
5. *(optional)* **`pool-strategy.png`** — an Analyst answer about pool strategy / "You vs. the
   Model" (boldness, a concrete swap), if you want to feature the differentiation angle.
6. *(optional)* **`mobile.png`** — a narrow (~390px) view of the predictor or dashboard if we
   want to show responsiveness.

For each, note the teams/state shown so captions can be accurate. (Alternatively, the docs
implementer can capture these from the running dev server — but per request, the list above is
what's needed from the user.)

## Non-goals

No code changes; no new product behavior; the docs only describe what already ships.
