## Context

The unified tabbed app is functional but the first styling pass reads as low-contrast dark-on-dark, the future-round bracket is noisy with "Winner of M.." labels, and the stats grid doesn't signal "bracket pool." This is a visual-polish pass — no logic changes — informed by the WC 2026 brand and common bracket-pool leaderboard patterns.

## Research → direction

**WC 2026 brand** ([jukeboxprint](https://www.jukeboxprint.com/blog/design-identity-2026-fifa-world-cup), [fwcumc colors](https://fwcumc.com/news/world-cup-logo-design/), [1000logos](https://1000logos.net/news/2026-fifa-world-cup-identity-introduces-new-design-system/)): restrained, near-institutional palette — black/white with **gold** primary and a **green** (malachite) counter-accent; bold geometric "26" motif. Direction: keep the dark base but commit to **gold as the primary accent and green as the secondary**, drop the busy teal/amber/orange triple-gradient, and lift contrast.

**Leaderboard patterns** ([leaderboarded](https://leaderboarded.com/blog/posts/fantasy-sports-leaderboard/), fantasy UI kits on [Dribbble](https://dribbble.com/tags/fantasy-sports)): a leaderboard/scorecard leads with a **prominent ranked hero number**, then scannable labelled rows; clear hierarchy and "where do I stand" legibility. Direction: make **Projected Score the hero** with rank-style framing, and lay out the rest as clean labelled rows (not a flat 2-col grid of equal cells).

## Decisions

**1. Theme tokens: gold primary + green accent, higher contrast.**
Define a small set of CSS variables / Tailwind tokens (base, surface, border, text, muted, gold, green) and apply consistently. Raise body text from low-contrast slate to a brighter foreground; brighten labels (the `text-[10px] text-slate-500` micro-labels are a big offender). Replace the tri-color gradient header rule with a gold→green accent.

**2. Blank future slots.**
In `BracketPredictor`, when a slot has no determined team, render an empty quiet cell (a faint dash/placeholder height) instead of the `Winner of M.. (X v Y)` string. This removes most of the visual noise; the bracket reads as mostly empty until the user fills it — which is the point.

**3. Scorecard as a standings card.**
Restyle the `Headline` panel: a hero block (Projected Score, large, gold) with a small "your projected standing"/rank caption, then a compact list of labelled stat rows (Still alive, Score/max, Upset bonus, Boldness, Champion). Use consistent row rhythm and dividers rather than equal boxes. Keep the pool-size control at the top. The figures and `data-testid`s are unchanged (numbers come from the engine).

**4. Scope: styling only.**
No changes to picks logic, evaluation, endpoints, or the share card's numbers. Only markup/classes/tokens in `BracketPredictor`, `AppShell`, `ScoutChat`, and `globals.css`.

## Risks / Trade-offs

- **Bracket width vs. chat sidebar** — improving the scorecard shouldn't worsen the bracket's horizontal squeeze next to the 360px chat; keep the bracket horizontally scrollable and the scorecard compact.
- **Contrast vs. the dark aesthetic** — lift contrast enough to be comfortable without going flat/bright; verify on the dark base.
- **Subjectivity** — "looks like a leaderboard" is judgement; the spec fixes the properties (hero figure, scannable labelled rows, reads-as-standings) and we verify visually in preview.

## Open Questions

- Whether to surface a literal "rank" (e.g. "top X% bracket") on the scorecard — we don't host pools, so there's no real rank; use projected score as the hero with pool-aware framing, not a fake rank. Confirm copy in implementation.
- Whether to weave in the geometric "26" motif as a subtle background — nice-to-have, deferred; keep this pass to palette + layout + contrast.
