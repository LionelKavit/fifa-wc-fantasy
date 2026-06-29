## MODIFIED Requirements

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
