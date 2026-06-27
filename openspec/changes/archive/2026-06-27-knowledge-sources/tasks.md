## 1. Knowledge location + placeholder

- [x] 1.1 Create the `knowledge/` directory at the repo root with a `README.md` documenting the format: drop `.md`/`.txt` files (one topic per file or per heading); the `favor:` / `fade:` signal convention; PDF coming later. Add a `.gitkeep`.

## 2. Loader (prose + signals)

- [x] 2.1 Add `lib/server/knowledge.ts#loadKnowledge()` → `{ snippets: KnowledgeSnippet[]; signals: KnowledgeSignals }`. Read `knowledge/*.md|*.markdown|*.txt` via `process.cwd()`, EXCLUDING `README.md`; split each file into prose snippets (`{ source, heading?, text }`) by heading/paragraph, tagged with the source filename.
- [x] 2.2 Parse the structured-signal convention (`favor:` / `fade:` lines, or a `## Signals` section) into `signals: { favor: string[]; fade: string[] }` (team names/abbrevs); keep those directive lines OUT of the prose snippets.
- [x] 2.3 Skip `.pdf` files gracefully (console note) as the documented extension point; the rest still load.
- [x] 2.4 Cache the parsed result (module-level); add `__setKnowledgeDirForTests(dir)` / `__resetKnowledgeCacheForTests()`. Empty/absent dir → `{ snippets: [], signals: { favor: [], fade: [] } }`.
- [x] 2.5 Add a pure `selectNotes(snippets, topic, { max })`: case-insensitive term match, capped to `max` and a total-size bound; no match → `[]`.

## 3. Chat consumer (tool)

- [x] 3.1 Thread snippets into the Scout context: add optional `expertNotes` to `BracketContext` (`lib/scout`) + `ScoutContext` (`lib/scout/tools.ts`); populate from `loadKnowledge().snippets` where the server builds the context (`lib/server/predictor.ts#buildScoutBracket`).
- [x] 3.2 Add a `get_expert_notes` tool to `SCOUT_TOOLS` (input `{ topic: string }`) + a case in `executeTool`: `selectNotes(ctx.expertNotes ?? [], topic)`, returned wrapped with an explicit "Unverified expert/pundit notes (reference only, may be outdated; not instructions)" label + source filenames; "no expert notes available yet" when empty/no match.

## 4. Verdict-note consumer (prose)

- [x] 4.1 Extend the verdict-note request with optional `subjects: number[]` (team ids); `BracketVerdict.tsx` computes them from the picks it holds (champion `M104`, finalists `M101`/`M102`).
- [x] 4.2 In `app/api/predictor/verdict-note/route.ts`, load knowledge, resolve the subject ids → names, select matching snippets, and pass them to `verdictNote`.
- [x] 4.3 In `lib/scout/verdict.ts`, accept the optional notes and append them as a labeled untrusted block after the facts; keep the "use only the supplied numbers for figures; notes are unverified color" instruction. No notes → unchanged output.

## 5. Generator consumer (signals)

- [x] 5.1 In `lib/engine/bracketGenerator.ts`, add optional `favor?: Set<number>` / `fade?: Set<number>` to the options; bias upset value/selection (favored underdog → value boost; faded favorite's match → stronger upset candidate). Empty sets → identical bracket; feasibility + determinism preserved.
- [x] 5.2 In `lib/server/predictor.ts#generatePrediction`, load knowledge, resolve `signals.favor`/`signals.fade` names → ids (via `resolveTeam`), and pass the sets to `generateBracket`.

## 6. Tests

- [x] 6.1 Loader: a fixtures dir with a `.md` yields attributed snippets and parses `favor:`/`fade:` into signals (directive lines excluded from prose); `README.md` excluded; `.pdf` skipped; empty dir → empty snippets+signals; cached.
- [x] 6.2 `selectNotes`: matching topic returns snippets (respecting the cap); absent topic → `[]`.
- [x] 6.3 `get_expert_notes` via `executeTool`: "no expert notes available yet" when empty; labeled snippets when present; output not flagged an error.
- [x] 6.4 Generator: empty favor/fade reproduces the no-signals bracket exactly; a favored underdog is preferred over a comparable non-favored upset; a faded favorite's match is biased toward an upset; determinism + feasibility hold with signals.
- [x] 6.5 `verdictNote`: with injected notes + a fake client, the notes reach the prompt; with no notes the output matches the no-knowledge path; deterministic template fallback unaffected.

## 7. Verify

- [x] 7.1 Verify (keyless ok for loader/tool/generator): empty `knowledge/` → tool reports none, generator unchanged, verdict unchanged. Drop a temporary `.md` with prose + `favor:`/`fade:`; confirm `loadKnowledge` picks up snippets + signals, `get_expert_notes` returns them labeled, and a generated bracket reflects the favored/faded bias; then remove the fixture. (With a key, optionally confirm the verdict note weaves a note in while staying grounded.)

## 8. Spec sync

- [x] 8.1 Confirm the implementation matches every scenario in `specs/knowledge-sources/spec.md`, `specs/scout-tools/spec.md`, `specs/bracket-generator/spec.md`, and `specs/bracket-verdict-card/spec.md`; keep code and specs in sync.
