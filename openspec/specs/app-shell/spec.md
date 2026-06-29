# app-shell Specification

## Purpose
TBD - created by archiving change unified-tabbed-app. Update Purpose after archive.
## Requirements
### Requirement: Tabbed single interface

The app SHALL present one page with two tabs, in order: **Knockouts** first (the bracket predictor) and **Group stage** second (the group tables). The Knockouts tab SHALL be the default shown on load. Exactly one tab's content is shown at a time; switching tabs changes the main view without a full page navigation.

#### Scenario: Knockouts is the default first tab

- **WHEN** the app loads
- **THEN** the Knockouts (bracket predictor) tab is active by default, listed first, with the Group stage tab second

#### Scenario: Switch between tabs

- **WHEN** the user selects the Knockouts or Group stage tab
- **THEN** the corresponding view is shown and the other is hidden, without a full page reload

#### Scenario: Group tab shows only the tables

- **WHEN** the Group stage tab is active
- **THEN** it shows the group standings (no bracket)

#### Scenario: Knockouts tab is the predictor

- **WHEN** the Knockouts tab is active
- **THEN** it shows the bracket predictor where the user can make picks, evaluate them, and lock & export

### Requirement: App branding

The app's headline SHALL read "FIFA World Cup 2026 Bracket Analyst". No user-facing surface (headline, page/tab title, or share card) SHALL display the name "Pocket Scout". The in-app chat assistant SHALL be called **"the Analyst"** in all user-facing copy (e.g. "Ask the Analyst", the answer-source label) — not "the Scout". (Internal module and capability names may remain `scout`; this is a display-name change only.)

#### Scenario: Headline names the Bracket Analyst

- **WHEN** the app shell renders
- **THEN** its headline reads "FIFA World Cup 2026 Bracket Analyst" and no "Pocket Scout" text is shown anywhere user-facing

#### Scenario: Page title rebranded

- **WHEN** the browser tab title is shown
- **THEN** it reflects the Bracket Analyst branding, not "Pocket Scout"

#### Scenario: Assistant is "the Analyst"

- **WHEN** the chat assistant is referenced in the UI
- **THEN** the assistant is referred to as "the Analyst" (not "the Scout") in all user-facing text

### Requirement: One persistent shared Scout chat

The app SHALL render a single Scout chat panel, shared across both tabs and persistent when switching tabs — the conversation and its state are retained (the panel is not remounted per tab).

#### Scenario: Conversation survives a tab switch

- **WHEN** the user has a chat exchange, switches tabs, and returns
- **THEN** the prior conversation is still present in the same chat panel

#### Scenario: Single chat instance

- **WHEN** either tab is active
- **THEN** the same one chat panel is shown (not a separate chat per tab)

### Requirement: Tab-aware chat context

The shared chat SHALL send context appropriate to the active tab: on the Knockouts tab it includes the user's current bracket picks and pool size; on the Group stage tab it sends no bracket context (group-stage behaviour).

#### Scenario: Knockouts tab sends bracket context

- **WHEN** the user asks a question while the Knockouts tab is active
- **THEN** the message includes the current picks and pool size, so the Scout can answer about the bracket

#### Scenario: Group tab sends no bracket context

- **WHEN** the user asks a question while the Group stage tab is active
- **THEN** the message includes no bracket context and is answered in group-stage scope

### Requirement: Per-tab data loaded on first view

Each tab's data SHALL be loaded when that tab is first shown and cached for the session, not re-fetched on subsequent switches. Because Knockouts is the default tab, the bracket data loads on initial view; the Group stage tab's data loads when it is first opened.

#### Scenario: Bracket loads with the default view

- **WHEN** the app loads (Knockouts default)
- **THEN** the bracket data is fetched and rendered for the Knockouts tab

#### Scenario: Loaded once per tab

- **WHEN** the user switches away from and back to a tab within the session
- **THEN** that tab's data is not re-fetched (it is reused from the first load)

### Requirement: Readable WC 2026 visual theme

The app SHALL use a readable visual theme grounded in the official FIFA World Cup 2026 brand: a restrained dark base with **gold** as the primary accent and a **green** counter-accent (echoing the tournament's gold-and-malachite trophy), applied consistently across the header, tabs, scorecard, bracket, and chat. The theme SHALL prioritise legibility (comfortable contrast, clear hierarchy). It SHALL use original styling only — no FIFA logos, emblems, or trademarked imagery.

#### Scenario: Consistent, on-brand accents

- **WHEN** the app renders any tab
- **THEN** the gold primary / green counter accents and dark base are applied consistently across the shell, tabs, scorecard, bracket, and chat

#### Scenario: Legible across the app

- **WHEN** the user reads any tab
- **THEN** text and interactive elements have comfortable contrast against the background

#### Scenario: No FIFA imagery

- **WHEN** the themed app renders
- **THEN** it uses original styling and contains no FIFA logos or trademarked imagery

