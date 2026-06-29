# Constructive, grounded bracket-tracker answers (stop the false "eliminated" doom)

## Why

A user autofilled a bracket and asked "how does my bracket look?". The Analyst replied
that the bracket was "effectively eliminated — 0% still alive with a current score of 1 out
of a possible 80", blamed a "culprit" pick, and told the user the path was already broken.
After they swapped the named pick, it still said "0% still alive … a result somewhere
earlier has already broken your path." This is demoralizing and **wrong**, and it makes the
chat feel like it is working against the user instead of helping.

Investigation (reproduced via `/api/predictor/generate` + `/api/predictor/evaluate` on a
freshly autofilled bracket) shows the answer is built on misleading metrics, not a real
problem:

- **"Still alive" is the probability of a PERFECT bracket** — `headlineSurvival` =
  survival through the Final (every remaining pick holding). It is the product of ~16+
  match probabilities, so it is ~0% for essentially *any* full bracket, even at the R32
  stage. The reproduced bracket showed survival of 0% at every stage **while having 0
  busted picks and 0 wrong picks.** 0% "still alive" does not mean eliminated; it means a
  perfect bracket is unlikely — true for everyone.
- **"1 out of 80/86" is points banked so far** (`currentScore` / `maxAchievable`). Early in
  the tournament almost nothing is decided, so this is naturally tiny — it is not a verdict
  on bracket quality.
- The Analyst then **invents a culprit and an "early bust"** when the engine reports no
  busted or wrong picks at all.

These are also exactly the figures we deliberately removed from the predictor's settings
box (the declutter change hid win %/verdict), so surfacing them in chat is inconsistent.

Generation is **not** at fault: the autofilled bracket reconciles with reality (decided
matches are overlaid to the real winner; the reproduced bracket had zero busted/wrong
picks). The fault is entirely in which metrics the tracker surfaces and how the Analyst
frames them.

## What changes

- **Honest tracker signals, not perfect-survival.** The bracket-evaluation tool
  (`evaluate_bracket`) SHALL stop headlining the perfect-bracket survival as "still alive"
  and the points-banked-so-far as a "score". Instead it SHALL surface signals that reflect
  reality: how many picks are still alive vs. actually busted (picked team eliminated) or
  wrong (decided match lost), the projected final score, and the pool-fit/standing. The
  perfect-run probability SHALL be dropped from the tool output entirely, so it can never be
  mistaken for the bracket being alive or eliminated.
- **Grounded health claims.** The Analyst SHALL call a bracket busted/eliminated or name a
  "culprit" pick ONLY when the tool reports actual busted/wrong picks. With zero busted
  picks it SHALL NOT say the bracket is eliminated or that a result already broke the path.
- **Constructive, decision-focused framing.** For "how does my bracket look?"-type
  questions the Analyst SHALL lead with a plain, honest read, note what is in good shape,
  and give at most one or two concrete, still-changeable improvements (a specific swap with
  its reason) — the advisor role. It SHALL NOT quote the perfect-survival %, the
  points-banked "X/80", or raw champion/head-to-head win % as a verdict, matching the
  decluttered UI.

## Impact

- Affected specs: `scout-tools` (evaluate_bracket output), `scout-conversation`
  (tracker/"how's my bracket" answer behavior).
- Likely code (implementation later): `lib/scout/tools.ts` (evaluate_bracket fields),
  `lib/scout/prompt.ts` (tracker framing + grounded-health rule). The engine metrics are
  unchanged; this is about what is surfaced and how it is described.
- No change to bracket generation, scoring math, or the model.

## Out of scope

- Changing the scoring or survival math in the engine (the numbers are correct; only their
  presentation is wrong).
- Bracket generation / autofill (verified correct — zero busted picks on a fresh autofill).
- Re-introducing win %/verdict into the predictor UI box.
