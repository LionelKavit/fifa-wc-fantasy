## Context

With the `web-api` routes serving grounded data and a streaming Scout, this change is the browser experience: a group dashboard plus a Scout chat panel. It mirrors the reference app's shape (App Router pages + `app/components/`, Tailwind 4, React 19). The data already arrives fully reasoned (situations + narration + probabilities), so the UI is presentation only — no qualification logic in the browser.

## Goals / Non-Goals

**Goals:**
- A glanceable group dashboard: standings + status + advancement probability, with the win/draw/loss conditional where contested.
- A multi-turn, streaming Scout chat panel that preserves history and labels the answer source.
- Clean, responsive Tailwind styling that reads well during a live tournament.

**Non-Goals:**
- No engine/grounding logic in the client — it consumes API JSON/streams only.
- No fantasy/team-auth UI.
- No design-system build-out beyond what the dashboard + chat need.
- No SSR data-fetching cleverness beyond what the non-standard Next docs recommend.

## Decisions

- **Presentation-only components.** The dashboard resolves its data server-side (a server component reading the same cached provider the data API uses) for a fast first paint with no client fetch waterfall; the chat panel consumes `/api/chat`. Either way components only render situations/probabilities and never recompute, keeping the browser bundle free of engine code and the Anthropic client.
- **Status-driven visual language.** Map the four advancement states (clinched / contention / thirdPlaceRace / eliminated) to distinct, accessible treatments (a status colour dot + a text status cell) so a group is readable at a glance. Each standings row is a fixed column grid (rank · team · P/GD/Pts · status) so content never overlaps in narrow cards. Probability shown as a compact bar/percentage for contested teams; settled teams show "Through"/"Out", not a misleading number. The win/draw/loss conditional is surfaced on hover (tooltip) to keep the compact row uncluttered.
- **Streaming chat via the fetch stream.** The chat panel POSTs `{ question, history }` and reads the streamed response body, appending tokens to the in-progress assistant turn; on completion it commits the turn to history and shows the source tag. Alternative: poll/buffer — rejected, loses the streaming feel.
- **History kept in component state.** The panel holds the running conversation and sends prior turns each request (the API is stateless). Simple and matches the Scout's `history` contract.
- **Tailwind 4 + App Router**, following the non-standard Next docs (read in `web-api`). Components under `app/components/`; the dashboard is the root page, with the chat panel alongside.

## Risks / Trade-offs

- **Streaming-read differences in the non-standard Next/runtime** → follow the docs; degrade gracefully to a buffered read if streaming isn't available, still showing the final answer.
- **Probability misread as certainty** → explicit "Through/Out" for settled teams; probabilities only for contested ones; label conditionals clearly.
- **Cluttered dashboard with 12 groups** → compact group cards, clear status colors, responsive grid; progressive disclosure of conditional detail.
- **Accessibility of status-by-color** → pair color with text labels, not color alone.

## Migration Plan

Depends on `web-api`. Add `app/page.tsx` (dashboard) and `app/components/` (group card, probability indicator, chat panel). Verify by running `next dev` and exercising the dashboard + chat against the live (or keyless) API; light component tests where practical.

## Open Questions

- Exact visual style (palette/type) — keep clean and tournament-appropriate; refine against screenshots during implementation.
- Whether to auto-refresh the dashboard during live matches (poll) or refresh on load only — start with on-load; add polling if useful.
- Whether the chat panel offers suggested prompts ("What does USA need?") to guide first-time users — likely yes, low cost.
