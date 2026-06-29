## 1. Evaluation tool — honest signals

- [x] 1.1 `lib/scout/tools.ts` (`evaluate_bracket`): remove `stillAlivePct` (perfect-bracket survival) from the output entirely, and replace the bare `currentScore`/`maxScore` with reality-reflecting fields — `picksAlive`, `picksBusted`, `picksWrong`, `projectedScore`, and `pointsSoFar` clearly labelled against the total.
- [x] 1.2 Update the tool's description so the model uses busted/alive counts + projected score for "how's my bracket", and does not read the flawless-bracket chance as aliveness.

## 2. Persona

- [x] 2.1 `lib/scout/prompt.ts`: tracker rule — be a constructive advisor (overall read + what's strong + one or two concrete swaps); call the bracket busted/eliminated or name a culprit ONLY when there are busted/wrong picks; never equate low perfect-survival or low points-so-far with elimination; don't quote perfect-survival %, points-banked "X/80", or raw win % as a verdict.

## 3. Tests

- [x] 3.1 `evaluate_bracket` tool test: a fresh fully-valid bracket reports `picksBusted: 0` and surfaces no "still alive" perfect-survival figure; a bracket with an eliminated team reports `picksBusted ≥ 1`.
- [x] 3.2 Existing scout tests updated for the new output shape.

## 4. Verify

- [x] 4.1 Live `/api/chat`: autofill a bracket, ask "how does my bracket look?" — the answer is constructive, does not call a 0-busted bracket eliminated, invents no culprit, and quotes none of the removed metrics. With a genuinely busted pick, it honestly names the damage. No console/server errors.

## 5. Spec sync

- [x] 5.1 Confirm code matches the MODIFIED requirements in `specs/scout-tools/spec.md` and `specs/scout-conversation/spec.md`.
