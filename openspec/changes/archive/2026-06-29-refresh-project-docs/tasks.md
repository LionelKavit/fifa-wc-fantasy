## 1. README (product-manager voice)

- [x] 1.1 Rewrite `README.md` leading with need → value (positioning, two moments of need, the five value pillars, advisor-not-host framing); cover the group dashboard, Bracket Predictor, and Analyst under the "Bracket Analyst" branding.
- [x] 1.2 Keep a concise quick-start (Node version, install/run, key-less "Stats" vs. conversational Analyst), the unofficial-hobby / original-styling / not-affiliated disclaimers, the spec-first note, and license. Embed the new screenshots.

## 2. Architecture

- [x] 2.1 Update `docs/ARCHITECTURE.md` to the current system: data (goal events + WC-history dataset), engine (group-stage + the full knockout pipeline + generators + decided locking + current-scorers/history aggregates), grounding, Analyst (tools + persona), server, and the Next.js surfaces. State the Elo-strength Monte-Carlo basis and live-conditioning.
- [x] 2.2 Touch up `docs/DATA.md` for the goal-event fields and the committed World Cup history dataset / provenance.

## 3. Evaluation (new)

- [x] 3.1 Write `docs/EVALUATION.md`: model basis + shared head-to-head model, test strategy + suite size, grounding guarantees, data provenance/coverage, and limitations / non-claims.

## 4. Screenshots

- [x] 4.1 Collect the screenshots per the design's shot list (from the user), replacing the stale images, and update `docs/images/README.md` to match. _(Folder `docs/images/` + manifest ready; awaiting the PNGs from the user.)_

## 5. Spec sync

- [x] 5.1 Confirm the docs satisfy the ADDED requirements in `specs/project-documentation/spec.md`.
