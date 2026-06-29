## 1. Evaluation tool

- [x] 1.1 `lib/scout/tools.ts` (`evaluate_bracket`): replace each pick's `match` (raw id) with a human `round` label derived from `p.stage` (R32→"Round of 32", R16→"Round of 16", QF→"Quarter-final", SF→"Semi-final", F→"Final"); stop returning `projectedScore`.
- [x] 1.2 Update the tool description to drop projected score and note picks are identified by round.

## 2. Persona

- [x] 2.1 `lib/scout/prompt.ts`: tracker rules — never mention internal match numbers/ids (refer to a pick by team + round); never mention the projected score; keep "how's my bracket" answers brief (read + what's strong + the single riskiest live pick, then stop); do not volunteer swaps unless the user asks for advice/a deeper look — offer to go deeper instead.

## 3. Tests

- [x] 3.1 `evaluate_bracket` tool test: picks carry a `round` label (e.g. "Round of 32"), no `match` id and no `projectedScore` in the output.

## 4. Verify

- [x] 4.1 Live `/api/chat`: autofill a bracket, ask "how's my bracket looking?" — the answer is short, references teams by round (no M-numbers), mentions no projected score, volunteers no unrequested swaps, and offers to go deeper. Asking for improvements then yields concrete swaps. No console/server errors.

## 5. Spec sync

- [x] 5.1 Confirm code matches the MODIFIED requirements in `specs/scout-tools/spec.md` and `specs/scout-conversation/spec.md`.
