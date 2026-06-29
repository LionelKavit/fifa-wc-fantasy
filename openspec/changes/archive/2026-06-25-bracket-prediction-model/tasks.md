## 1. Types

- [x] 1.1 Add prediction types to `lib/engine/types.ts`: `Prediction` (picks: `Map<string, number>` of matchId→teamId), `PredictionCompleteness` (`"empty" | "partial" | "complete"`), and a derived `PredictionView` (per-match predicted participants + winner, per-round survivors, champion when complete).

## 2. Prediction model module

- [x] 2.1 Create `lib/engine/prediction.ts` exporting an empty-prediction constructor and pure helpers; export from `lib/engine/index.ts`.
- [x] 2.2 Implement `predictedParticipants(bracket, prediction, matchId)`: R32 from the bracket's resolved slots; later rounds from the feeder matches' picks (or null when a feeder is unpicked/unresolved).
- [x] 2.3 Implement `pick(prediction, bracket, matchId, teamId)`: reject if `teamId` is not a current predicted participant; otherwise set the pick and cascade-clear later picks that are no longer reachable.
- [x] 2.4 Implement `clear(prediction, bracket, matchId)` with the same upward cascade.
- [x] 2.5 Implement `completeness(bracket, prediction)` and `derivePrediction(bracket, prediction)` (per-match winner, round survivors, champion when complete).

## 3. Locking

- [x] 3.1 Implement `isPredictionLocked(snapshot)` — true once the earliest knockout (R32) fixture has kicked off; reuse the data layer's fixture status/kickoff handling.
- [x] 3.2 Gate `pick`/`clear` on lock state (or expose a guarded variant) so modifications are rejected once locked.

## 4. Tests (Vitest)

- [x] 4.1 Representation: a pick records a participant; unpicked matches report unpicked; picking a non-participant is rejected.
- [x] 4.2 Propagation: later-round participants equal the feeder picks; changing an earlier pick cascade-clears now-invalid later picks; result stays consistent.
- [x] 4.3 Completeness: empty/partial/complete; complete yields exactly one champion (the Final pick).
- [x] 4.4 Locking: editable before first knockout kickoff; rejected once it has started.
- [x] 4.5 Purity: pick/clear perform no I/O and are deterministic.

## 5. Spec sync

- [x] 5.1 Confirm implementation matches every scenario in `specs/bracket-prediction/spec.md`; update the spec if behavior is intentionally refined during implementation.
