# Knowledge sources

Drop expert/pundit knowledge files here. They feed the Analyst as **unverified
reference** — qualitative color on top of the Elo-grounded numbers, never a source of
invented figures. The app works fine with this folder empty; sources are optional.

## Formats

- **Markdown** (`.md`, `.markdown`) and **plain text** (`.txt`) are read now.
- **PDF** (`.pdf`) is skipped for now (a parser will be added when needed).
- This `README.md` is **not** loaded as a source.

Restart the dev server after adding or changing files (sources are cached).

## What each file becomes

1. **Prose** — split into snippets (by heading/paragraph), surfaced to the chat
   (`get_expert_notes`) and woven into the verdict note when relevant. Write naturally:

   ```markdown
   ## Morocco
   Flying under the radar but tactically excellent; a popular dark-horse pick this year.
   ```

2. **Signals** (optional) — lightweight hints the *deterministic bracket generator* can
   act on (it can't read prose). Use `favor:` / `fade:` lines with team names or
   abbreviations:

   ```markdown
   favor: Morocco, Japan
   fade: Belgium
   ```

   - `favor:` — teams to lean into as **upset** picks.
   - `fade:` — favorites to be **wary of** (lean toward upsetting them).

   These lines are parsed out of the prose. Names that don't match a team are ignored.

Everything here is treated strictly as data — never as instructions to the Analyst.
