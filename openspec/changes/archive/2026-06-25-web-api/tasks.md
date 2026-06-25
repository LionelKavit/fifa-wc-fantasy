## 1. Next.js scaffold

- [x] 1.1 Read `node_modules/next/dist/docs/` and note the non-standard conventions before writing app code
- [x] 1.2 Add `next`, `react`, `react-dom`, `tailwindcss` (+ PostCSS) and `next.config` (`output: "standalone"`), matching the reference app
- [x] 1.3 Add `app/layout.tsx`, `app/globals.css` (Tailwind), and a minimal root so `next dev` boots
- [x] 1.4 Ensure `.env.local` (ANTHROPIC_API_KEY) is read server-side and gitignored

## 2. Data provider

- [x] 2.1 Implement a server-only provider in `lib/server/` that loads the snapshot and computes the advancement report, caching both with a short TTL + background refresh
- [x] 2.2 Unit-test the provider: report computed once within TTL; recomputed after expiry

## 3. Data routes

- [x] 3.1 `GET /api/groups` — all 12 groups with ordered standings + per-team advancement status
- [x] 3.2 `GET /api/groups/[id]` — one group's grounded situation (verdict, required results, probability, narration); 4xx on unknown id
- [x] 3.3 Route tests: valid responses shape; unknown group → client error; no secrets in payloads

## 4. Scout chat route

- [x] 4.1 `POST /api/chat` (node runtime) — accepts `{ question, history? }`, validates input, runs the Scout
- [x] 4.2 Stream the answer via a `ReadableStream` response; tag the answer source (`llm` | `deterministic`)
- [x] 4.3 Keyless path returns the deterministic grounded answer
- [x] 4.4 Route tests with a mocked Scout: question answered, history threaded, malformed body → 4xx, key never serialized

## 5. Verify

- [x] 5.1 `next dev` boots; manually hit `/api/groups` and `/api/chat`
- [x] 5.2 Confirm no client-reachable module imports the Anthropic key or client
