# Design — constructive, grounded bracket-tracker answers

## Evidence (reproduced)

`POST /api/predictor/generate {poolSize:100, risk:"balanced"}` → 31 picks, then
`POST /api/predictor/evaluate`:

```
currentScore: 1 / maxAchievable: 86
projectedScore: 32
headlineSurvival (still alive %): 0% (survival by stage: R32 0, R16 0, QF 0, SF 0, F 0)
busted picks (team already out): 0
wrong picks (decided, lost): 0
```

A clean, fresh bracket — 0 busted, 0 wrong — reports 0% "still alive" at *every* stage,
because `headlineSurvival` is the probability that **all** remaining picks hold (a perfect
bracket). That product is ~0 for any full bracket. The Analyst read 0% + "1/86" as
"effectively eliminated" and fabricated a culprit. Root cause = metric framing, not a bug in
generation or scoring.

## What each current metric actually means

- `comparison.headlineSurvival` — P(every remaining pick holds through the Final). ~0% for
  essentially all full brackets; **not** an elimination signal.
- `comparison.survival[stage]` — P(all picks through that stage hold). Also a product →
  tiny.
- `score.current` / `score.maxAchievable` — points banked from decided matches / total
  possible. Tiny early in the tournament.
- `comparison.projectedScore` — expected final points. The genuinely forward-looking number.
- pick `status` ∈ {pending, correct, wrong, busted} — the honest, per-pick reality signal.
  `busted` = picked team already eliminated; `wrong` = decided match the pick lost.

## Decisions

1. **Health = busted/alive counts, not perfect-survival.** Define the tracker's headline
   health from pick statuses: `picksBusted` (status busted) + `picksWrong` (status wrong)
   vs `picksAlive` (pending with the team still in). This is what "is my bracket okay?"
   actually means. Perfect-survival is **dropped from `evaluate_bracket` entirely** so it
   cannot be misread as aliveness.
2. **`evaluate_bracket` output (proposed shape).** Keep `projectedScore`, `champion`,
   `boldness`, `upsetBonus`, `poolSize`, and the per-pick list. Remove `stillAlivePct`
   (perfect survival) outright, and replace the headlined `currentScore`/`maxScore` with:
   `picksAlive`, `picksBusted`, `picksWrong`, and `pointsSoFar` clearly labelled as
   banked-so-far (with the total) so the model cannot mistake it for a final verdict. Pool
   standing (win-probability / pool-fit) continues to come from `bracket_strategy`.
3. **Grounded-health rule (persona).** The Analyst calls a bracket eliminated/busted, or
   names a culprit pick, ONLY when `picksBusted > 0` or `picksWrong > 0`. With none, it must
   not claim the path is broken. It must never equate a low perfect-survival % (or low
   points-so-far) with being eliminated.
4. **Constructive framing (persona).** "How does my bracket look?" → one honest sentence on
   overall shape, what is strong, and at most one or two concrete still-changeable swaps
   (specific drop/take + reason). No quoting of perfect-survival %, points-banked "X/80", or
   raw win % as a verdict — consistent with the decluttered settings box.

## Non-goals

- No change to the engine's survival/scoring computations (correct as-is).
- No change to generation/autofill (verified: 0 busted on a fresh autofill).
- The deterministic (no-API-key) fallback narration is unaffected.

## Testing approach (for implementation)

- `evaluate_bracket` tool test: a fresh, fully-valid bracket reports `picksBusted: 0` and
  does not surface a perfect-survival figure as "still alive"; a bracket containing an
  eliminated team reports `picksBusted ≥ 1`.
- Persona/prompt: a fresh bracket with 0 busted picks must not be described as eliminated or
  given a culprit (verified live via `/api/chat`).
