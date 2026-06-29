## Context

`generateBracket(snapshot, opts)` (`lib/engine/bracketGenerator.ts`) builds a bracket in two passes: a chalk pass (favorite at every match, resolving participants top-down via `predictedParticipants`) that also scores each match's upset "value", then it spends `boldnessBudget(risk, poolSize)` on the highest-value candidate upsets. The server `generatePrediction` calls it (heuristic path) and the `/api/predictor/generate` route returns the picks; the UI (`BracketVerdict`, from `declutter-bracket-panel`) replaces all picks and currently confirms before overwriting.

A partially-filled bracket from the UI is always **path-consistent**: a match can only be picked once its feeders are picked, so there are never floating downstream picks. Completion is therefore forward-only.

## Goals / Non-Goals

**Goals:**
- Complete a bracket from its current picks: keep valid existing picks, fill only gaps. Empty = full generation (unchanged output).
- Boldness budget counts existing upsets so the whole bracket honors the risk/pool target without ever changing an existing pick.
- Primary action = Complete (no clobber, no overwrite confirm); Clear = reset to zero.

**Non-Goals:**
- Provenance-based re-optimization (keep only user-tweaked picks, re-roll the rest) — Mode B, out of scope.
- Back-propagation (not needed: partial state is path-consistent).
- Changing the leverage generator, the probability model, or scoring.

## Decisions

**1. `locked` option, top-down honor.** Add `locked?: Prediction` to `GenerateBracketOptions`. In the existing top-down pass, at each match: resolve participants from what's decided so far; if `locked` has a pick for this match **and** that team is one of the resolved participants, set it (and mark it locked, ineligible for the budget); otherwise take the chalk favorite and, if it's a real-underdog opportunity, register it as a budget candidate. Because the pass is top-down (R32 → Final) and the input is path-consistent, a locked downstream pick's participants are already determined by the time we reach it. An existing pick that isn't a valid participant (stale/inconsistent) is ignored and the match is decided normally — keeping the bracket feasible.

**2. Budget counts locked upsets.** Compute `target = boldnessBudget(risk, poolSize)` over the whole bracket. Count `lockedUpsets` = locked picks that are head-to-head underdogs. Spend `remaining = max(0, target − lockedUpsets)` on the open candidates (the existing value-ranking + favor/fade + seeded jitter, unchanged). So: a user who already went bold gets chalk-filled gaps; a user who went chalk gets upsets added in the gaps up to the target; locked upsets are never removed even if they exceed the target.

**3. Empty `locked` is a strict no-op.** With no locked picks, every match is open, `lockedUpsets = 0`, and the algorithm reduces exactly to today's behavior — guaranteeing the from-scratch output (and all existing determinism/monotonicity tests) is unchanged.

**4. Server + endpoint.** `generatePrediction` gains the current picks and passes `locked = new Map(picks)`. The route accepts an optional `picks: [matchId, teamId][]` (validated like the pool-finish route's picks — array of `[string, number]`; malformed picks → ignored or 400). Absent/empty → full generation.

**5. UI: Complete, not clobber.** The build action posts the current picks. It never overwrites, so the overwrite `confirm()` is removed. Label by state: empty → "Build my bracket for me"; partial → a "finish/complete" label; complete (no gaps) → disabled. Clear bracket stays as the reset (Clear → Build = fresh full bracket). A fresh seed per build still varies which upsets fill the *gaps* (existing picks never change).

## Risks / Trade-offs

- **No global re-optimization.** Completion won't re-think untouched picks around a tweak (that's Mode B / provenance). Accepted: predictability over surprise; Clear+Build gives a fresh take.
- **Budget over-subscribed by locked upsets.** If the user locked more upsets than the target, gaps are filled chalk and the bracket is bolder than the nominal risk — correct (we never override the user) and worth a one-line note in the helper/relevant copy if it confuses.
- **Stacks on `declutter-bracket-panel`.** This change modifies `bracket-verdict-card` requirements introduced there (unarchived), so it must be archived after it. Called out in the proposal; deltas are written against the post-declutter wording.
- **Determinism with locks.** Output stays deterministic given inputs + seed + locked set; covered by tests (empty == from-scratch; completion keeps picks; budget counts locked).
