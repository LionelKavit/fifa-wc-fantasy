## ADDED Requirements

### Requirement: Concise advanced-teams summary

Each group card SHALL show a brief one-line summary naming the teams that have **advanced** to the knockout stage from that group. A team counts as advanced when it is effectively certain to advance (its next-round/advancement probability is at or near 100%, which also captures a third-placed team that qualifies as a best third). The summary SHALL NOT enumerate teams still in contention or teams that are eliminated. When no team in the group has yet secured advancement, the summary SHALL show a brief "still being decided" line instead. This card summary is derived in the UI from the per-team advancement data and is independent of the Scout's fuller grounded group narration.

#### Scenario: Names the advanced teams

- **WHEN** a group has teams that are effectively certain to advance
- **THEN** the card's summary names exactly those teams as advanced (e.g. "Group A: MEX and RSA have advanced.")

#### Scenario: No contention or elimination clutter

- **WHEN** the group summary renders
- **THEN** it does not list teams still fighting to advance or teams that are out

#### Scenario: Undecided fallback

- **WHEN** no team in the group has secured advancement yet
- **THEN** the summary shows a brief not-yet-decided line rather than naming advanced teams
