# Explain favouritism with the real model drivers (Elo + strength)

## Why

When asked "why is Netherlands the favourite?", the Analyst invented qualitative reasons —
"a deeper squad and higher FIFA ranking" — and led with the tournament win % (4% vs 1%).
Neither is what the model uses: the engine is purely Elo-strength based (Elo rating → a
Poisson strength multiplier). The head-to-head tool didn't expose those numbers, so the
model had nothing concrete to cite and filled the gap with plausible-sounding but
ungrounded factors. Users asking "why" want the actual metrics that drove the call.

## What changes

- **Tool**: `compare_teams` additionally returns the concrete model drivers for each team —
  its **Elo rating** and its **strength multiplier** (the mean-≈1 Poisson input behind the
  odds) — alongside the existing head-to-head probability and deep-run odds.
- **Persona**: when asked WHY a team is favoured/stronger (or how the model decided), the
  Analyst explains it by quoting those drivers (e.g. "Netherlands' Elo is 1980 vs Morocco's
  1877, a strength of 1.63 vs 1.26"). It SHALL NOT attribute favouritism to factors the
  model does not use (FIFA ranking, "deeper squad", form, pedigree), and SHALL NOT lead with
  the tournament win % unless that was asked.

## Impact

- Affected specs: `scout-tools` (the head-to-head tool now exposes Elo + strength drivers),
  `scout-conversation` (matchup/why answers cite those drivers).
- Affected code (already implemented): `lib/scout/tools.ts` (drivers in `compare_teams` +
  `strengths` on context), `lib/scout/scout.ts` and `lib/server/predictor.ts` (pass
  `STRENGTHS` through), `lib/scout/prompt.ts` (the why-explanation rule).
- No change to the model itself, the odds, or any figure — only what is surfaced/cited.
