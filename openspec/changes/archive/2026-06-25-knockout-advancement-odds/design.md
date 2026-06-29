## Context

`advancement-probability` already runs the heavy lifting: `simulate(snapshot, opts)` in `lib/engine/montecarlo.ts` samples every remaining group fixture per trial (sharing one global sample space across groups), recomputes all 12 standings, and runs `rankThirdPlaced` to find the best-8 thirds — accumulating per-team advance counts and single-fixture conditional splits. `buildBracket(snapshot)` (from `knockout-bracket-structure`) produces the tree structure, and `createPoissonModel()` is an injectable `OutcomeModel`. What is missing: each trial currently *stops* at the 32 qualifiers. This change continues each trial through the bracket and reports per-stage reach probabilities, plus the self-computed Annex C allocation the trials need (there is no FIFA assignment inside a simulated future).

## Goals / Non-Goals

**Goals:**
- Per-team P(reach R16/QF/SF/Final/Champion), monotonic and settled-case-pinned.
- Per-trial bracket play-out reusing the existing `OutcomeModel` and bracket structure.
- Matchup-level conditional win probabilities (upset-radar fuel) without a second pass.
- Self-computed Annex C allocation, encoded as data, used when no snapshot assignment exists; grounded assignment still wins when present.
- Determinism: same (snapshot, trials, seed) ⇒ same odds.

**Non-Goals:**
- UI, API, persistence, share cards, the upset radar feature itself (this only emits its input data).
- Changing `advancement-probability` requirements; R32 advancement stays its boundary.
- Re-deriving group-stage sampling — reuse `simulate`'s existing loop and sample space.
- A third-place playoff (absent from the data, per `knockout-bracket-structure`).

## Decisions

**1. Extend the existing trial loop in `montecarlo.ts`, do not fork a second simulation.**
The group-stage sampling, the global sample space, and seeding are already correct and tested. Each trial, after computing `advancing` and the per-group ordered rows, has everything needed to seed the R32: group winners/runners-up and the eight thirds with their group letters. We continue the same trial into the bracket. Alternative — a separate knockout-only simulator fed by advancement outputs — would duplicate sampling and lose the coupling between group results and seeding. Rejected.

**2. Inside a trial, build R32 seeding directly from the trial's standings, not by calling `buildBracket` on a synthesized snapshot.**
`buildBracket` reads a `TournamentSnapshot`; fabricating a snapshot per trial (50k×) is wasteful. Instead, precompute the static layout once (the R32 pairing table, third-placed slot candidate sets, and the R16→Final chaining already encoded in `bracket.ts`) and, per trial, fill seeds from the trial's winners/runners-up/thirds. The static layout SHOULD be exported from `bracket.ts` so both `buildBracket` and the simulator share one source of truth. Alternative — per-trial snapshot synthesis — is simpler but too slow. Rejected.

**3. Annex C allocation derived from FIFA's official candidate sets via perfect matching.** *(decided — authenticity)*
FIFA's full 495-row Annex C table lives only in the regulations PDF and is not published machine-readably, so transcribing it would risk fabrication. Instead `allocateThirds(qualifiedGroupLetters): Map<matchNumber, groupLetter>` derives the assignment from FIFA's official per-slot **candidate sets** (which *are* published and verifiable) by computing a bipartite perfect matching (Kuhn's algorithm). Properties that make this authentic: (a) every assignment respects FIFA's candidate sets, so a third only ever lands where FIFA permits; (b) it is exact wherever the matching is forced — and the graph is sparse (group K is a sole candidate for match 80, L for match 87), so most combinations are forced; (c) a unit test confirms a valid matching exists and is produced for **all 495** combinations, which also validates the candidate sets themselves. For the rare combinations admitting multiple valid matchings, a deterministic canonical one is chosen (groups alphabetical, slots by match number); the effect on simulated odds is negligible. `buildBracket` uses it as a fallback when the snapshot lacks an R32 assignment (grounded resolution wins); the simulator always uses it. Alternative — hardcoding 495 unverifiable rows — rejected as both fabrication-prone and no more accurate where the matching is forced.

**4. Knockout draws resolved as real football: extra time, then a 50/50 shootout.** *(decided — authenticity)*
On a level 90-minute sample, the trial samples extra-time goals at a reduced rate (`DEFAULT_KO_EXTRA_TIME_LAMBDA ≈ 0.45` per team, ~30 of 90 minutes); if still level, a penalty shootout is decided 50/50. Penalties are empirically close to random, so a coin flip is *more* authentic than biasing the favourite (which a strength-weighted Bernoulli would do). All draws are resolved on the trial's RNG stream, preserving reproducibility. Already-completed knockout results in the snapshot are kept fixed instead of sampled.

**5. Stage counting is monotonic by construction.**
Each trial advances a single set of teams round by round; a team is counted for every stage up to where it is eliminated. This guarantees the monotonicity the spec requires without post-hoc correction.

**6. Matchup conditionals via accumulators, not storage of trials.**
For each realized pairing, keep `{meetings, aWins}` keyed by the unordered team pair. Conditional win % = `aWins/meetings`. This is O(matches) memory per trial and avoids retaining trial histories. Pairings span all rounds; the key is the unordered id pair.

## Risks / Trade-offs

- **Annex C table mis-transcription (495 entries)** → encode as data with a documented source; unit-test against FIFA's published example allocations; assert structural invariants (each combination yields a perfect matching within candidate sets). This is the highest-risk item.
- **Performance: 50k trials × ~31 knockout matches adds work** → reuse buffers (as the current loop does), avoid per-trial allocations, keep the outcome model call cheap; make trial count configurable as today. Measure against the existing group-only runtime.
- **Memory from matchup conditionals** (many possible pairings) → keyed sparse map of only realized pairings; acceptable. If it grows, expose conditionals lazily/top-N.
- **Boundary drift vs. `advancement-probability`** → derive R32 entry from the same `advancing` set so P(reach R16) ≤ P(reach R32) holds by construction; add a cross-check test.

## Migration Plan

Additive only. New module(s) and an extended `SimulationResult`; existing `advancementProbabilities` output is unchanged. No data migration, no rollback concerns. Annex C table lands as a reviewed data file with tests before the simulator depends on it.

## Resolved Questions

- **Annex C source** → resolved (Decision 3): derive from FIFA's official per-slot candidate sets via perfect matching rather than transcribing the unpublished 495-row table. The candidate sets were cross-checked against Wikipedia and ESPN's published fixtures (and a Phase A transcription error in match 82's set — missing group E — was corrected as part of this work).
- **Knockout tiebreak** → resolved (Decision 4): extra time (reduced-rate sample) then a 50/50 penalty shootout.

## Open Questions

- Whether to surface matchup conditionals for *all* realized pairings or only the most-probable ones — currently all realized; revisit if memory warrants.
