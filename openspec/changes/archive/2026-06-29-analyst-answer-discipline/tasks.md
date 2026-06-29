## 1. Persona prompt

- [x] 1.1 `lib/scout/prompt.ts`: add a rule that the Analyst never narrates its process or tools (no mention of expert notes / their absence, of what it "would like to pull in", or of which tools it used/wants to use; if no expert notes, just answer from the model).
- [x] 1.2 `lib/scout/prompt.ts`: extend the brevity rule so follow-up "why" questions stay to one or two sentences and do not repeat a figure already given.

## 2. Verify

- [x] 2.1 Live `/api/chat`: ask a matchup then a follow-up "why" question — the answer is one or two sentences, mentions no expert notes/tools, and does not repeat the figure. No console/server errors.

## 3. Spec sync

- [x] 3.1 Confirm code matches the MODIFIED "Persona and scope" requirement in `specs/scout-conversation/spec.md`.
