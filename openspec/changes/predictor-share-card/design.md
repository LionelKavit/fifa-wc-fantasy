## Context

The predictor (`bracket-predictor-ui`) holds a fan's prediction and gets it evaluated server-side (scoring + model comparison). The share card turns that into a single image worth posting. It renders numbers the engine already produces; it adds no new computation beyond layout.

## Goals / Non-Goals

**Goals:**
- A deterministic image card: champion, survival %, scores, divergence, original styling.
- A stable shareable representation (link encoding the prediction) that reproduces the card for link previews.
- Figures grounded in the same evaluation the predictor uses.

**Non-Goals:**
- Engine changes; the card consumes existing evaluation output.
- Accounts, persistence, or social-platform integrations beyond producing a shareable image/link.
- Animated or interactive cards.

## Decisions

**1. The card is generated server-side from an encoded prediction in the URL.**
The shareable representation encodes the prediction (the picks) in the link; opening it renders the card image server-side. This makes the card self-contained and suitable for link-preview crawlers (no client JS needed to see it). The encoding is compact (matchId→teamId picks) and stable.

**2. Numbers come from the same evaluation path as the predictor.**
The card route evaluates the encoded prediction with `scorePrediction` + `compareToModel` over the current snapshot (or computes only the figures it shows), so the card can never disagree with the predictor. Determinism follows from the engine's determinism (fixed seed/trials) for a given snapshot.

**3. Determinism caveat is scoped to a snapshot.**
"Same prediction → same card" holds for a given snapshot and simulation settings (seed, trials). As real results come in, the card's "as it stands" figures legitimately change; within one snapshot they are reproducible. The spec's determinism requirement is read in that scope.

**4. Original styling, image output.**
The card uses the app's own visual language (no FIFA imagery). Output is a static image suitable for sharing; the exact rendering mechanism follows the repo's non-standard Next.js (`node_modules/next/dist/docs/`) rather than assuming stock OG-image tooling.

## Risks / Trade-offs

- **Simulation cost per card render** → reuse the cached snapshot-only baseline; keep the card's trial count modest (the headline figure tolerates small noise) or reuse a recently computed evaluation.
- **Non-standard Next.js image tooling** → confirm the available image-response mechanism in `node_modules/next/dist/docs/` before implementing; fall back to a server-rendered SVG→image if needed.
- **Long encoded URLs** → encode picks compactly (e.g. a fixed-order list of winners) to keep the share link short.
- **Stale "as it stands" figures in cached link previews** → acceptable; the link re-renders current figures when fetched; cache TTL is short.

## Open Questions

- Exact card dimensions/layout and the encoding format for the prediction — pinned in implementation/design review.
- Whether to also offer a "model's chalk bracket" comparison visual on the card or keep it to the headline divergence number — default to the number; revisit with design.
