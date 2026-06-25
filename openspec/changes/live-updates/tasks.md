## 1. Live detection & refresh cadence

- [ ] 1.1 Add a helper to detect whether any fixture is currently live from a snapshot
- [ ] 1.2 Make the data provider choose a short TTL when live and the normal TTL otherwise; keep the server cache in front of the feed
- [ ] 1.3 Unit-test cadence selection (live → short TTL; idle → normal TTL) and bounded refresh

## 2. Live-aware grounding

- [ ] 2.1 Add a `live` option to `buildGroupSituation`/`buildTeamSituation` that uses provisional (live-folded) standings
- [ ] 2.2 Surface live fixtures + current scores in the situation output; flag standings provisional/live
- [ ] 2.3 Adjust narration to describe the live state ("as it stands") for live-affected teams
- [ ] 2.4 Unit-test against a synthetic snapshot with an in-progress fixture: table folds the live score; live fixtures identifiable

## 3. Live-conditioned probabilities

- [ ] 3.1 Seed in-progress matches from their current scoreline and sample only the remaining goals (minute-scaled where available, fallback fraction otherwise)
- [ ] 3.2 Keep clinched/eliminated pins; completed and not-started matches unchanged
- [ ] 3.3 Unit-test monotonicity: a team currently leading a live match has probability ≥ the equivalent not-started case

## 4. Expose live state via API

- [ ] 4.1 Include live-fixture state (which are live + current scores) in the data API responses
- [ ] 4.2 Serve live-aware (provisional) situations/probabilities during live windows
- [ ] 4.3 Route tests: live indicator present; provisional view returned when a fixture is live

## 5. Dashboard auto-refresh & indicators

- [ ] 5.1 Poll the API on an interval gated on live state; stop polling when nothing is live
- [ ] 5.2 Update the dashboard in place without resetting scroll or clearing the Scout chat
- [ ] 5.3 Add live-match indicators (live badge + current score), distinct from completed/scheduled
- [ ] 5.4 Verify with a live window (or synthetic in-progress fixture): dashboard moves as scores change, idle when nothing is live
