## Why

The generator fills a bracket once, but the natural next thought is "let me try a bolder one" — and today that means clearing everything and re-picking the risk. Phase 7 closes the loop with in-place **Regenerate / Bolder / Safer** controls on the verdict card, so a casual fan can iterate toward a bracket they like in one tap.

## What Changes

- After a complete bracket exists, the verdict card SHALL show a compact **rebuild** control:
  - **Regenerate** — re-run the generator at the current risk level with a **new seed**, producing a *different* valid bracket (variety, not the same deterministic output).
  - **Bolder / Safer** — shift the risk one level along safe ↔ balanced ↔ bold (clamped; the button is disabled at the extreme) and regenerate. The current risk level is shown; pool size is preserved.
  - Each rebuild repopulates the **editable** bracket via the existing populate path, so the tree updates and the verdict re-evaluates. These are explicit rebuild actions — they replace the current bracket without a per-click confirm — with a loading state while generating and an error state on failure.
- **Variety wiring**: the generate server helper and `POST /api/predictor/generate` accept an optional **seed** so Regenerate yields a different bracket; the client passes a fresh random seed each rebuild. The engine generator is already deterministic given a seed.

## Capabilities

### Modified Capabilities
- `bracket-verdict-card`: add the in-place rebuild control (Regenerate / Bolder / Safer) shown once a bracket is complete; rebuilding repopulates the editable bracket and re-evaluates.
- `bracket-generator`: the generate endpoint + server helper accept an optional seed so Regenerate produces a varied bracket (the engine already supports it).

## Impact

- **UI** (`app/components/BracketVerdict.tsx`): render a rebuild row in the complete-state verdict (Regenerate / Bolder / Safer + current risk); reuse the existing `risk` state and generate flow; pass a fresh random seed per rebuild; disable Bolder/Safer at the ends; loading/error states. `BracketPredictor.tsx`'s `onGenerate` already repopulates picks — unchanged.
- **API/server** (`app/api/predictor/generate/route.ts`, `lib/server/predictor.ts#generatePrediction`): accept an optional `seed` (validated) and thread it into `generateBracket`. No seed → current default behavior.
- **No** engine logic change (the generator already takes a seed and is deterministic), and **no** new data dependency.
- Deferred polish (possible future phases): save & compare multiple brackets; a coin-flips-only fill mode; named personas (the risk slider + bolder/safer already cover preset risk); compare-to-crowd / "most pools pick X" (needs real public-pick % data, not yet available).
