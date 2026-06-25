## 1. Types

- [x] 1.1 Define `TeamSituation` and `GroupSituation` types in `lib/grounding/situation.ts` (position, topTwo, advancement, required-result effects, rivals, decisive fixtures, optional probability + conditional)

## 2. Situation assembly

- [x] 2.1 Implement `buildTeamSituation(snapshot, teamId, report?)` joining standings + verdict + optional advancement report
- [x] 2.2 Implement `buildGroupSituation(snapshot, groupId, report?)` (ordered table + per-team situations + decided places)
- [x] 2.3 Unit-test assembly against the recorded snapshot: fields reflect engine outputs; probability present only when a report is supplied; required-result effects surfaced for alive teams

## 3. Narration

- [x] 3.1 Implement deterministic templates in `lib/grounding/narrate.ts` keyed on advancement status + required-result shape (clinched / alive / thirdPlaceRace / eliminated)
- [x] 3.2 Unit-test narration: clinched reads as secured; required result stated for alive teams; third-place-race phrased as deferred/uncertain
- [x] 3.3 Add a test asserting every narrated fact maps to a structured field (no prose-only claims)

## 4. Accessors

- [x] 4.1 Export `buildTeamSituation` / `buildGroupSituation` returning structure + narration from `lib/grounding/index.ts`
- [x] 4.2 Verify outputs are pure and serializable (ready to be returned from an agent tool)
