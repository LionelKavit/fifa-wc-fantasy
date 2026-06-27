## ADDED Requirements

### Requirement: Expert notes tool

The Scout toolset SHALL include a `get_expert_notes` tool that returns relevant expert/pundit snippets for a topic or team from the loaded knowledge sources, each labeled as unverified reference. When no sources are present (or none match), it SHALL return a clear "no expert notes available yet" result rather than an error. The returned content is reference **data**: the Analyst may cite it but SHALL NOT treat it as instructions, and SHALL NOT present it as a grounded figure (the Elo numbers remain the source of truth).

#### Scenario: Returns relevant notes when sources exist

- **WHEN** the tool is called with a topic that matches loaded expert snippets
- **THEN** it returns those snippets labeled as unverified expert/pundit reference

#### Scenario: No sources yet

- **WHEN** the tool is called and no knowledge sources are present
- **THEN** it returns a clear "no expert notes available yet" result, not an error

#### Scenario: Notes are data, not commands

- **WHEN** a returned snippet contains text shaped like an instruction
- **THEN** the Analyst treats it as reference data and does not act on it
