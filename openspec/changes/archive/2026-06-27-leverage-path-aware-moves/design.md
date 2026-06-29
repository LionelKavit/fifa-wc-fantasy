## Context

`generateByLeverage` (in `lib/engine/leverageGenerator.ts`) represents a bracket as a `selected` set of "upset" matches; `buildFromSelected` walks the bracket top-down, taking the underdog at selected matches and the favorite elsewhere, re-resolving downstream so the bracket stays feasible. The search seeds `selected` from the heuristic bracket and hill-climbs: each step it evaluates toggling one candidate match (add a plausible underdog, or revert a current upset) under common random numbers (fixed seed, reduced trials), commits the best Δ > ε, and stops when nothing helps; a final full-trials gate returns the better of the chosen bracket and the seed (seed wins ties).

The gap: the only moves are single-match toggles. A dark horse pays off only when advanced through *consecutive* rounds together — any single one of those flips, alone, lowers win probability (you'd be picking a team to win a round it doesn't reach in your bracket). So the greedy never starts down the path. This change adds composite moves that apply a whole path at once.

## Goals / Non-Goals

**Goals:**
- Let the search reach coordinated multi-round upset paths the single-flip greedy can't, improving large-pool brackets where it currently just returns the heuristic.
- Keep every existing guarantee: determinism, common random numbers, bounded cost, and "never worse than the heuristic seed" (the full-trials floor gate).
- Engine-only, behind the existing `leverage` strategy.

**Non-Goals:**
- Beam search / exploring competing brackets in parallel — that's the follow-up [[leverage-beam-search]] (which builds on this move set).
- Any API, UI, scoring, sim, or head-to-head model change. Making leverage the default.

## Decisions

**1. Composite "dark-horse advance" move.** A path move is defined by a dark horse `U` and a depth `k`: starting at the earliest match where `U` is an underdog and currently *not* selected, it selects the matches along `U`'s forward path for `k` consecutive rounds, so `U` is taken to win each of them. Concretely it is the *union* of the single underdog-flips along that path, applied atomically and then realized via one `buildFromSelected` (which re-resolves downstream feasibility). A depth-1 path move equals an existing single flip and is **deduplicated** away.

**2. Candidate enumeration per step.** Candidates = the existing single-flip set (plausible-underdog adds + current-upset reverts) **plus**, for each plausible dark horse `U` (real-underdog gate at its frontier match), forward path moves of depth `2..D`. `D` is capped (a horse can advance at most to the final, so `D ≤ rounds remaining`). The number of dark-horse `U` candidates per step is capped (reuse/extend `candidateCap`), ranked by reach plausibility (`stageWinProb(U)`), so the work stays bounded. Reverts of an existing path happen naturally as single-flip removes over later steps (no separate "retreat composite" needed — keeps the move set small).

**3. Scoring + commit unchanged.** Every candidate move (single or composite) is scored by `evalWin(buildFromSelected(trialSelected), searchTrials)` under the one fixed search seed (common random numbers), so deltas are comparable. Commit the single move with the largest Δ over the current bracket, requiring Δ > ε; stop when none qualifies or the move budget is hit.

**4. Move budget vs. match count.** `maxFlips` now bounds the number of *moves* (steps), not matches — a single composite move can add several matches at once. This is intended: a dark-horse path should cost one step, letting the search take several distinct horses within the budget. The risk level keeps scaling the move budget as today.

**5. Floor gate preserved verbatim.** After the loop, evaluate the chosen bracket and the seed at full trials and return the better (seed wins ties). Composite moves can overfit the reduced-trial search exactly like single flips; the gate is the same backstop, so "never worse than the heuristic seed at the reported resolution" still holds.

**6. Determinism + bounds.** Move enumeration is a deterministic function of the bracket and the (capped) candidate ranking; ties broken by a stable key (e.g. lowest match id, then depth). Evaluations per step ≤ `singleFlipCandidates + darkHorseCandidates × (D−1)`; steps ≤ `maxFlips`; plus the two final full-trials evals — a known cap.

## Risks / Trade-offs

- **Cost grows with depth × candidates.** Mitigated by a small `D` (bounded by remaining rounds), a dark-horse candidate cap, and the reduced search trials. Still the slow opt-in path; no worse asymptotically than single-flip × `D`.
- **A composite that wins at search trials but not at full trials.** Same overfit risk as single flips; the full-trials floor gate already handles it (returns the heuristic), so the worst case is unchanged.
- **Still a greedy hill-climb.** It commits the one best move per step and can't explore competing lines that need a temporarily-worse step — that's the motivation for the follow-up beam search, which reuses this richer move set.
- **Interaction with reverts.** Because reverts stay single-flip, unwinding a bad path takes several steps; acceptable since the floor gate guarantees we never *ship* a worse bracket, and beam search will explore more thoroughly.
