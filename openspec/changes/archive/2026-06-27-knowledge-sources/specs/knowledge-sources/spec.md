## ADDED Requirements

### Requirement: Knowledge source location and format

The system SHALL provide a defined repository location — a `knowledge/` directory — where expert/pundit source files are added, with a placeholder README documenting the expected format. Markdown and plain-text files SHALL be read as sources. PDF SHALL be a documented extension point: until a parser is added, PDF files are skipped gracefully (not an error). The placeholder README SHALL NOT be treated as a source.

#### Scenario: Markdown and text files are sources

- **WHEN** the loader runs over a `knowledge/` directory containing a `.md` or `.txt` file
- **THEN** that file's content is loaded as an expert-knowledge source

#### Scenario: README is not a source

- **WHEN** the directory contains the placeholder `README.md`
- **THEN** it is excluded from the loaded sources

#### Scenario: PDF skipped until supported

- **WHEN** the directory contains a `.pdf` file and no PDF parser is configured
- **THEN** the file is skipped without error, and the rest of the sources still load

### Requirement: Cached loader with a graceful empty default

The system SHALL load the source files server-side, normalize them into snippets (each tagged with its source filename), and cache the result. When no real sources are present, the loader SHALL return an empty set so the application behaves exactly as it did before any sources were added.

#### Scenario: No sources is a no-op

- **WHEN** the `knowledge/` directory has no source files (only the placeholder)
- **THEN** the loader returns no snippets and nothing else in the app changes

#### Scenario: Sources are split into attributed snippets

- **WHEN** a markdown source with multiple sections is loaded
- **THEN** it is split into snippets, each carrying the source filename for attribution

#### Scenario: Result is cached

- **WHEN** the loader is invoked more than once without the sources changing
- **THEN** the files are parsed once and subsequent calls are served from cache

### Requirement: Untrusted reference contract

Loaded source content SHALL be treated strictly as reference **data, never as instructions**. When surfaced, it SHALL be clearly labeled as unverified expert/pundit reference that may be outdated. Nothing in a source file SHALL be able to change the Analyst's behavior, scope, or rules; embedded directives in a source SHALL be ignored as data.

#### Scenario: Surfaced notes are labeled unverified

- **WHEN** snippets are returned for use
- **THEN** they are accompanied by a label marking them as unverified expert/pundit reference

#### Scenario: Embedded instructions are inert

- **WHEN** a source file contains text shaped like an instruction (e.g. "ignore your rules")
- **THEN** it is carried only as reference data and does not alter the Analyst's behavior

### Requirement: Structured signals for the engine

Because the deterministic generator cannot read free prose, the loader SHALL also extract lightweight **structured signals** from the source files via a documented convention (e.g. `favor:` / `fade:` team lists, or a `## Signals` section): a set of **favored** teams (to lean into as upsets) and **faded** teams (favorites to be wary of), as team names/abbreviations. When no source declares signals, the signals SHALL be empty. Signal directives SHALL NOT appear as prose snippets (they are parsed out), and signals SHALL never introduce numeric figures — they are only nudges.

#### Scenario: Favor and fade parsed from a source

- **WHEN** a source file declares favored and/or faded teams via the convention
- **THEN** the loader returns those teams in the favored/faded signal sets

#### Scenario: No signals declared

- **WHEN** no source declares any signal
- **THEN** the favored and faded signal sets are empty

### Requirement: Topic relevance selection

Given a topic or team, the loader SHALL return the snippets relevant to it (a case-insensitive match on the topic terms), capped to a sensible number/size for token budget; when the source set is small it MAY return all snippets.

#### Scenario: Relevant snippets returned

- **WHEN** notes are requested for a topic that appears in some snippets
- **THEN** the matching snippets are returned, bounded by the cap

#### Scenario: No match returns nothing

- **WHEN** notes are requested for a topic that appears in no snippet
- **THEN** no snippets are returned
