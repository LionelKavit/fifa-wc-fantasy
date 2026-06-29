# Analyst answer discipline: no process narration, tight follow-ups

## Why

In use, the Analyst leaked its internal monologue and tool bookkeeping into answers —
e.g. "Beyond the numbers I'd want to pull in some expert notes for more color. No expert
notes loaded yet, so I can only go by the model." — and rambled on follow-up "why"
questions, repeating a figure it had already given. That reads as low-quality and
contradicts the existing "very brief, no reasoning shown" persona rule, which was not
explicit enough about tool/process narration or about follow-ups.

## What changes

Tighten the Analyst persona (the frozen system prompt) and the `scout-conversation` spec so
the brevity rule explicitly covers two cases:

- **No process or tool narration.** The Analyst never mentions expert notes (or that none
  are loaded), what it "would like to pull in", or which tools it used or wants to use. If
  there are no expert notes, it simply answers from the model without saying so.
- **Tight follow-ups.** Follow-up "why"/explanation questions stay to one or two sentences
  and do not repeat a figure already given earlier in the conversation.

This is a persona/answer-style refinement only — grounding, scope, tool routing, and the
deterministic fallback are unchanged.

## Impact

- Affected spec: `scout-conversation` (the "Persona and scope" requirement gains two
  scenarios).
- Affected code: `lib/scout/prompt.ts` (two added rules) — already implemented.
- No API, tool, or data changes.
