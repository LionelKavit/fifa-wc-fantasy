## 1. Types and module scaffold

- [x] 1.1 Add bracket types to `lib/engine/types.ts`: `Feeder` (discriminated union: `group` {group, position: "winner"|"runnerUp"}, `thirdPlace` {candidateGroups}, `matchWinner` {matchId}), `BracketSlot` ({feeder, team, label}), `BracketMatch` ({id, matchNumber, stage, slots, winner}), and `Bracket` ({matches, byStage}).
- [x] 1.2 Create `lib/engine/bracket.ts` exporting `buildBracket(snapshot): Bracket` as a pure function (no network/UI); export from `lib/engine/index.ts`.

## 2. Static layout tables (constants)

- [x] 2.1 Transcribe the official 2026 R32 seeding layout (matches 73–88: which group winner/runner-up pairs each slot) plus the R16→Final chaining (matches 89–104, excluding 3rd-place playoff 103) as named constants with source citations.
- [~] 2.2 Encode the third-placed **candidate group sets** per slot (the structural part of Annex C). The full 495-row Annex C combination→slot table is **deferred** to a later change (needed only for snapshots lacking an authoritative assignment, e.g. simulations); see spec note.

## 3. Tree construction (structure only)

- [x] 3.1 Build the 16 R32 matches with their group-source and third-placed-source feeders per the seeding layout.
- [x] 3.2 Build R16/QF/SF/Final matches with `matchWinner` feeders, chaining each round to the previous so the tree connects to a single Final.
- [x] 3.3 Generate human-readable placeholder labels for every slot ("Winner Group F", "Runner-up Group C", "3rd C/E/F/H", or in terms of a predecessor match).

## 4. Resolution from snapshot + existing capabilities

- [x] 4.1 Resolve group winners/runners-up into R32 slots from `group-standings`, only for finalized groups; leave others as placeholders.
- [x] 4.2 Resolve third-placed slots **grounded in the snapshot's own R32 fixtures** (via the paired group winner's assigned opponent); leave candidate-set placeholders until the assignment is present. (Self-computed Annex C assignment deferred — see 2.2.)
- [x] 4.3 Resolve knockout match winners from completed R32+ fixtures in the snapshot and propagate them into the next round's slots.

## 5. Tests (Vitest)

- [x] 5.1 Structure tests: exact match counts (16/8/4/2/1), every slot has a feeder, tree chains to a single Final, construction is deterministic for identical snapshots.
- [x] 5.2 Seeding tests: all 12 winners and 12 runners-up placed exactly once, specific pairings match the official layout, exactly eight third-placed slots.
- [x] 5.3 Third-placed grounding tests: candidate-set placeholder until assigned; grounded resolution from the snapshot's R32 fixture; each slot resolves to one team when fully assigned. (Annex C self-computation tests deferred with 2.2.)
- [x] 5.4 Placeholder/resolution tests: undecided groups render position placeholders; undetermined third-placed render candidate-set placeholders; progressive resolution as groups/matches finalize; a fully assigned bracket has zero R32 placeholders.

## 6. Spec sync

- [x] 6.1 Updated `specs/knockout-bracket/spec.md` (and proposal) so the third-placed requirement reflects grounded snapshot resolution + candidate sets, with self-computed Annex C assignment explicitly deferred. Code and spec are in sync.
