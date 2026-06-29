# Tracker answers: human rounds, no projected score, and brief

## Why

The constructive tracker answer is better, but still leaks internal jargon and runs long:

- It cites **internal match numbers** ("Canada already came through in M73", "Algeria … in
  M85"). Users have no idea what M73 is.
- It quotes the **projected score** ("Projected score of 33 is a competitive number"), which
  is non-interpretable for a casual user.
- It is **too long** — it should end after the read + what's strong. It volunteers a "one
  concrete swap to consider" the user didn't ask for, restating a bold pick already
  mentioned. Depth should come only when the user asks for it.

## What changes

- **No match numbers.** Picks are referred to by team and round ("Canada came through in
  their Round of 32"), never by internal match id. The evaluation tool SHALL expose a
  human round label per pick instead of the raw match id.
- **No projected score in chat.** The evaluation tool SHALL stop returning the projected
  (expected) score, and the Analyst SHALL never mention it. (The predictor UI/share card,
  separate surfaces, are unchanged.)
- **Brief by default.** A "how does my bracket look?" answer SHALL be short — an honest
  read plus what's strong (and the single riskiest live pick, named by team + round) — and
  SHALL stop there. It SHALL NOT volunteer swaps the user didn't ask for; instead it MAY
  offer to go deeper. Concrete swaps come only when the user asks for advice/a deeper look.

## Impact

- Affected specs: `scout-tools` (evaluation tool output), `scout-conversation` (tracker
  answer behavior).
- Affected code: `lib/scout/tools.ts` (per-pick round label, drop projected score),
  `lib/scout/prompt.ts` (no match ids, no projected score, brevity + don't volunteer swaps).
- No engine, scoring, or UI-card changes.
