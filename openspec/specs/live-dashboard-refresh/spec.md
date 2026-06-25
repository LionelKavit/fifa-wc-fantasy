# live-dashboard-refresh Specification

## Purpose
TBD - created by archiving change live-updates. Update Purpose after archive.
## Requirements
### Requirement: Auto-refresh during live windows

The dashboard SHALL refresh its data automatically while matches are live, so standings, statuses, and probabilities update without a manual reload; it SHALL stop auto-refreshing when no matches are live.

#### Scenario: Updates while live

- **WHEN** matches are live and the dashboard is open
- **THEN** it periodically refetches and re-renders the latest live-aware data without a full page reload

#### Scenario: Idle when nothing is live

- **WHEN** no matches are live
- **THEN** the dashboard does not poll on an interval

### Requirement: Live match indicators

The dashboard SHALL visually indicate which matches are in progress and show their current score.

#### Scenario: Live game shown as live

- **WHEN** a fixture is in progress
- **THEN** the dashboard marks it as live and displays its current score, distinct from completed and scheduled fixtures

### Requirement: Stable, non-disruptive updates

Live refreshes SHALL update in place without losing the user's scroll position or interrupting an in-progress Scout chat.

#### Scenario: Refresh preserves context

- **WHEN** a live refresh occurs while the user is reading or mid-chat
- **THEN** the dashboard updates in place without resetting scroll or clearing the chat conversation

