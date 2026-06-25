## 1. App shell & data fetching

- [x] 1.1 Resolve dashboard data server-side via the cached provider (server component); the chat panel consumes `/api/chat`
- [x] 1.2 Set up the root page layout (dashboard + chat side by side / stacked on mobile)

## 2. Group dashboard

- [x] 2.1 Group card component: ordered standings (team, P, GD, Pts) from the API
- [x] 2.2 Advancement status treatment: distinct, accessible color + label for clinched / contention / thirdPlaceRace / eliminated
- [x] 2.3 Advancement probability indicator (bar + %) for contested teams; "Through"/"Out" for settled teams; win/draw/loss conditional where available
- [x] 2.4 Responsive grid of 12 group cards; verify no horizontal overflow on mobile

## 3. Scout chat panel

- [x] 3.1 Chat panel component with message list + input; block empty submissions
- [x] 3.2 POST `{ question, history }` to the chat API and render the streamed answer incrementally
- [x] 3.3 Keep conversation history in state and send prior turns each request
- [x] 3.4 Show the answer source (Scout vs deterministic) and a friendly error on request failure
- [x] 3.5 Optional: suggested starter prompts

## 4. Verify

- [x] 4.1 `next dev`: dashboard renders all groups with correct status/probabilities
- [x] 4.2 Chat works multi-turn and streams; keyless mode shows deterministic answers labelled as such
- [x] 4.3 Spot-check responsive layout at mobile and desktop widths
