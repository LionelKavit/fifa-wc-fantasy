# group-dashboard Specification

## Purpose
TBD - created by archiving change web-ui. Update Purpose after archive.
## Requirements
### Requirement: Group standings display

The dashboard SHALL display each group's ordered standings as a labelled table with column headers for matches played, goal difference, and points, plus a qualification-chance column. Each row shows the team's country flag, code, matches played, goal difference, and points. The layout SHALL stay uncluttered: no truncated full team names and no overlapping content.

#### Scenario: Standings rendered per group with headers

- **WHEN** the dashboard loads
- **THEN** each group shows column headers (played, GD, points, next round) and its four teams in ranked order with those values, and no row shows a clipped/half-rendered team name

### Requirement: Team detail dialog

Each team in the standings SHALL be clickable, opening a dialog that shows the team's full name, its completed World Cup fixtures with full-time scores, and a one-line description of its qualifying status. The dialog SHALL be dismissable.

#### Scenario: Open on click

- **WHEN** the user clicks a team in a group
- **THEN** a dialog opens showing that team's full name, a one-line qualifying-status description, and its completed fixtures with full-time scores

#### Scenario: Results listed with scores

- **WHEN** the dialog is open for a team that has played
- **THEN** each completed fixture is listed with the opponent and the full-time score

#### Scenario: No matches yet

- **WHEN** the team has no completed fixtures
- **THEN** the dialog indicates that no matches have been played yet

#### Scenario: Dismissable

- **WHEN** the dialog is open
- **THEN** it can be closed (e.g. close button, backdrop click, or Escape)

### Requirement: Country flags

The dashboard SHALL show each team's country flag (emoji) beside its name.

#### Scenario: Flag shown per team

- **WHEN** a team is rendered
- **THEN** its country flag appears next to its abbreviation

#### Scenario: Unknown code degrades gracefully

- **WHEN** a team has no known flag mapping
- **THEN** a neutral placeholder flag is shown rather than broken output

### Requirement: World Cup 2026 dark theme

The dashboard SHALL use a dark visual theme inspired by the FIFA World Cup 2026 website palette — a deep navy/near-black background with the tournament's gold, teal, and navy accents (plus host-nation green/blue/red) and light text — presented minimally, using original styling only (no copyrighted FIFA logos or imagery).

#### Scenario: Dark themed presentation

- **WHEN** the dashboard is viewed
- **THEN** it renders on a dark background with light text and a cohesive World Cup 2026-inspired accent palette (gold/teal/navy), with sufficient contrast for readability

#### Scenario: Cards have room to breathe

- **WHEN** group cards are laid out
- **THEN** they are arranged at most two per row on wide screens so each card's columns have room and no value overlaps the team name

### Requirement: Next-round chance column

The dashboard SHALL show a "Next Round" column giving every team's probability of reaching the Round of 32 as a percentage — consistently for all teams, including clinched (100%) and eliminated (0%) — presented as a plain number with no progress bar and no status dot.

#### Scenario: Every team shows a percentage

- **WHEN** the dashboard renders a group
- **THEN** each team's qualification chance is shown as a percentage, with a clinched team at 100% and an eliminated team at 0%

#### Scenario: No progress bar or status dot

- **WHEN** the qualification chance is shown
- **THEN** it is a plain percentage value — not a progress bar — and no colored status dot is rendered

#### Scenario: Conditional on hover

- **WHEN** a contested team has win/draw/loss conditional probabilities
- **THEN** they are available on hover

### Requirement: Glanceable live state

The dashboard SHALL make the live qualification state visually distinguishable at a glance (e.g. distinct treatment for through / contested / out).

#### Scenario: Status is visually distinct

- **WHEN** a group contains teams of differing status
- **THEN** through, contested, and eliminated teams are visually differentiated

### Requirement: Responsive layout

The dashboard SHALL render legibly across desktop and mobile widths.

#### Scenario: Mobile width

- **WHEN** the dashboard is viewed at a narrow width
- **THEN** group content remains readable without horizontal overflow

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

