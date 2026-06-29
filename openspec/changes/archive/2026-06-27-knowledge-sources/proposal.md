## Why

The Analyst is grounded in Elo numbers, but a real "expert friend" also knows the qualitative color — pundit takes, expert previews, form notes. We want to feed that in later without re-plumbing anything. Phase 6 builds the **scaffolding and a working placeholder**: a defined place to drop knowledge files (markdown now, PDF later) and the wiring to surface them across the Analyst's three surfaces — the **chat**, the **verdict note**, and the **bracket generator** — as **untrusted** input. No real sources are authored here; until the user adds files, the app behaves exactly as today.

## What Changes

- A defined repo location — a **`knowledge/` directory** — for dropping in expert/pundit files, with a placeholder **README** documenting the format. Markdown and plain-text files are read now; **PDF is a documented extension point** (skipped gracefully until a parser is added). The README/placeholder is not treated as a source.
- A cached, **server-side loader** that turns the source files into two things, each empty when there are no sources:
  - **Prose snippets** (by heading/paragraph, tagged with the source filename) — for the LLM surfaces (chat + verdict note).
  - **Structured signals** — a lightweight, documented convention in the source files (`favor:` / `fade:` team lists, or a `## Signals` section) parsed into favored/faded teams — for the deterministic generator, which cannot read free text.
- An **untrusted contract**: prose is reference **data, never instructions**, labeled unverified (may be outdated); it rides on the Analyst's existing injection resistance. Signals are bounded numeric/id nudges, never a source of invented figures (Elo stays the source of truth).
- Three consumers, all graceful no-ops when empty:
  - **Chat** — a new `get_expert_notes` tool returns relevant labeled snippets (or "none yet").
  - **Verdict note** — the Analyst's one-line read may weave in relevant untrusted notes about the bracket's notable teams (champion/finalists); absent → identical to today.
  - **Generator** — favored teams get a bias toward being taken as upsets and faded favorites a bias toward being upset, applied deterministically within the existing boldness budget; absent → identical to today.

## Capabilities

### New Capabilities
- `knowledge-sources`: the `knowledge/` location + format + placeholder, the cached loader (prose snippets + structured favor/fade signals; markdown/text now, PDF as a documented extension point), the untrusted-reference contract, and topic/team relevance selection.

### Modified Capabilities
- `scout-tools`: add a `get_expert_notes` tool that surfaces relevant untrusted expert snippets (or "none yet"), cited as data the Analyst may reference but never obey.
- `bracket-verdict-card`: the Analyst verdict note may incorporate relevant untrusted expert notes about the bracket's notable teams; with no sources it is unchanged.
- `bracket-generator`: accept optional favor/fade signals that deterministically bias which upsets the boldness budget is spent on; with no signals it is unchanged.

## Impact

- **New** `knowledge/` directory (repo root) with a placeholder `README.md` (format + the `favor:`/`fade:` signal convention) and `.gitkeep`.
- **New** server loader (`lib/server/knowledge.ts`): reads `knowledge/` via `process.cwd()`, produces `{ snippets, signals }`, caches, excludes the README, skips PDFs; team-name relevance + name→id resolution; test seams (dir override + cache reset).
- **Scout** (`lib/scout/tools.ts` + context assembly): thread snippets into the Scout context; add `get_expert_notes` to `SCOUT_TOOLS` + `executeTool` (grows/keeps-stable the cached prefix).
- **Verdict note** (`lib/scout/verdict.ts`, `app/api/predictor/verdict-note/route.ts`, `BracketVerdict.tsx`): the endpoint loads + selects notes for the bracket's subjects (champion/finalists, passed by the card) and includes them, labeled untrusted, in the note prompt; no subjects/sources → unchanged.
- **Generator** (`lib/engine/bracketGenerator.ts`, `lib/server/predictor.ts`): the engine accepts optional `favor`/`fade` team-id sets that bias upset value/selection; the server resolves signal team names → ids and passes them; empty → unchanged. Engine stays pure and deterministic.
- **No** change to the public-pick-% model (replacing the chalk-bias γ with real pick data remains a separate later concern). LLM-path use verified with a key; the loader, signals, tool, and generator bias are unit-testable without one.
