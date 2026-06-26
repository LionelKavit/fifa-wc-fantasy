## 1. Prediction-evaluation tool

- [ ] 1.1 Define an `evaluatePrediction` Scout tool (explicit, validated input schema for the picks) in `lib/scout/`.
- [ ] 1.2 Implement its executor over the current snapshot via `scorePrediction` + `compareToModel`, returning a compact grounded summary (projected score, survival, boldness, upset bonus, notable per-pick status/odds) with full detail on request.
- [ ] 1.3 Handle no-picks (grounded "no bracket" result) and invalid picks (tool error, not exception).

## 2. Team-strength / head-to-head tool

- [ ] 2.1 Define a `teamStrength` tool (resolve one or two team names via the existing resolver).
- [ ] 2.2 Implement it: per-team Elo strength + deep-run odds (`knockoutProbabilities`); for a pair, the head-to-head win probability (matchup-conditional, else normalized marginals).

## 3. Conversation scope

- [ ] 3.1 Broaden the frozen system prompt to the three needs (group-stage, bracket advice, tracker), choosing the right tool per question and requiring provided picks for bracket/tracker answers.
- [ ] 3.2 Register both new tools in the Scout's tool set alongside the existing group-stage tools; keep brevity + grounding discipline.

## 4. Tests (Vitest)

- [ ] 4.1 `evaluatePrediction` executor: returns engine-sourced summary matching `scorePrediction`/`compareToModel`; no-picks → grounded result; invalid picks → error.
- [ ] 4.2 `teamStrength` executor: two-team call returns a head-to-head probability; single-team returns strength + odds; unknown name → not-found.
- [ ] 4.3 (If the loop is testable without a live key) a bracket question routes through the evaluate tool; otherwise cover executors directly.

## 5. Spec sync

- [ ] 5.1 Confirm implementation matches every scenario in `specs/scout-tools/spec.md` and `specs/scout-conversation/spec.md`; keep code and specs in sync.
