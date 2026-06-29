## Context

The generator (Phase 4) fills a bracket from `risk` + `poolSize`; the Build box (verdict card's incomplete state) drives it and `onGenerate(picks)` populates the editable tree. Once complete, the card shows the verdict and the Build box is gone — so iterating ("try bolder") today means Clear → re-pick risk → Generate. The engine `generateBracket(snapshot, { risk, poolSize, ..., seed })` is already deterministic given a seed (currently defaulted to 1). Phase 7 surfaces in-place rebuild controls and threads a seed through so Regenerate gives variety.

## Goals / Non-Goals

**Goals:**
- Regenerate / Bolder / Safer on the complete-state verdict card, reusing the existing generate flow.
- Variety: a per-rebuild seed so Regenerate differs; Bolder/Safer shift risk one level (clamped).
- Repopulate the editable bracket; preserve pool size; loading/error feedback.

**Non-Goals:**
- Save & compare brackets, coin-flips-only mode, named personas, compare-to-crowd (deferred; the last needs public-pick data we don't have).
- No engine algorithm change (seed support already exists).

## Decisions

**1. Thread an optional seed end to end.** `generatePrediction(poolSize, risk, seed?)` passes `seed` into `generateBracket`; `POST /api/predictor/generate` validates an optional numeric `seed` and forwards it. Omitted → unchanged. This makes Regenerate meaningful (a fixed seed would reproduce the same bracket).

**2. Reuse the existing generate flow in the card.** `BracketVerdict` already has `risk` state and a `generate()` that POSTs `{ poolSize, risk }` then calls `onGenerate(picks)`. Generalize it to `generate(nextRisk?, seed?)`: Regenerate calls `generate(risk, freshSeed)`; Bolder/Safer compute the shifted level (`["safe","balanced","bold"]` index ±1, clamped), set it as the new `risk`, and call `generate(shifted, freshSeed)`. A fresh seed is `Math.floor(Math.random() * 2**31)` per click.

**3. Rebuild control lives in the complete state.** Add a small row inside the `Verdict` block (or just above the existing Clear bracket button) with Regenerate / Bolder / Safer and the current risk label. Bolder disabled when `risk === "bold"`, Safer when `risk === "safe"`. The same `generating`/`genError` state already used by the Build box drives the loading/error feedback; on failure the existing bracket stays (we only call `onGenerate` on success).

**4. No per-click confirm.** These buttons are an explicit rebuild; unlike the initial Generate (which guards overwriting in-progress *manual* picks), Regenerate/Bolder/Safer act immediately. (The bracket is already generator-produced at this point.)

## Risks / Trade-offs

- **Losing manual tweaks on rebuild.** A user who hand-edited after generating loses those edits on Regenerate/Bolder/Safer. Accepted: the buttons clearly say "rebuild," and the prior bracket isn't otherwise recoverable anyway; a confirm would add friction to the core iterate loop. (Save/compare, deferred, would address keeping versions.)
- **Randomness vs. reproducibility.** Using `Math.random()` for the seed means rebuilds aren't reproducible across sessions — which is the desired behavior for "give me another." The engine stays deterministic for tests (explicit seed).
- **Seed validation.** The endpoint accepts only a finite number as `seed`; anything else is ignored (treated as no seed) so a malformed seed can't break an otherwise valid request.
