## 1. Chat API context

- [ ] 1.1 Extend the `app/api/chat` request to accept optional `picks` (matchId→teamId) and `poolSize`; validate leniently (ignore malformed context, still answer the question).
- [ ] 1.2 Thread the context into the Scout's tool-execution context so the bracket tools can read it; leave streaming and server-side key handling unchanged.
- [ ] 1.3 Tests: a question with picks makes them available to tools; a question with no context behaves as today; malformed context does not crash.

## 2. Predictor chat panel

- [ ] 2.1 Add a Scout chat panel on `/predictor`, reusing the `ScoutChat` component, that attaches the current picks + pool size to each message.
- [ ] 2.2 Add a small pool-size control (sensible default, optionally remembered locally) included in the bracket context.
- [ ] 2.3 Keep the dashboard chat unchanged (sends no bracket context).

## 3. Verification

- [ ] 3.1 Verify in the running app (preview): on `/predictor`, ask "is this pick smart?" / "how's my bracket?" and get answers grounded in the current picks; the dashboard chat still answers group-stage questions.

## 4. Spec sync

- [ ] 4.1 Confirm implementation matches every scenario in `specs/scout-chat-api/spec.md` and `specs/scout-chat-ui/spec.md`; keep code and specs in sync.
