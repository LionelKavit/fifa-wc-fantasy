# scout-tools Specification

## Purpose
TBD - created by archiving change scout-agent. Update Purpose after archive.
## Requirements
### Requirement: Engine-backed tool definitions

The system SHALL define tools the model can call to obtain grounded facts: at minimum, resolving a team or group by natural-language name, retrieving a team situation, retrieving a group situation, and retrieving advancement probabilities. Each tool's input schema SHALL be explicit and validated.

#### Scenario: Tools cover the core questions

- **WHEN** the Scout needs qualification facts
- **THEN** tools exist to resolve a team/group by name and to return that team's or group's grounded situation, including advancement probability

#### Scenario: Tool inputs are schema-validated

- **WHEN** the model calls a tool with arguments
- **THEN** the arguments are validated against the tool's input schema before execution, and an invalid call returns a tool error rather than throwing

### Requirement: Tools return grounded facts only

Tool execution SHALL be implemented by the grounding layer over a `TournamentSnapshot`, returning structured situations/probabilities — never free-text the model could mistake for its own computation.

#### Scenario: Tool output is engine-sourced

- **WHEN** a Scout tool executes
- **THEN** its result is derived from the engine/grounding layer for the current snapshot, not fabricated or estimated by the model

#### Scenario: Unknown team handled

- **WHEN** the model asks for a team name that does not resolve
- **THEN** the tool returns a not-found result the model can relay, rather than guessing a team

### Requirement: Name resolution is forgiving

The team/group resolution tool SHALL match common names, abbreviations, and minor variations to the correct squad where unambiguous.

#### Scenario: Common name resolves

- **WHEN** the user refers to a team by a common name or abbreviation (e.g. "USA", "Korea")
- **THEN** the resolver returns the matching squad

### Requirement: Prediction evaluation tool

The system SHALL provide a Scout tool that, given a user's bracket picks, returns a grounded evaluation produced by `bracket-prediction-scoring` and `prediction-model-comparison` over the current snapshot. The output SHALL lead with signals that reflect reality: each pick's status (pending/correct/wrong/busted), its **head-to-head win probability against its predicted opponent** (the same figure the bracket card and the team-comparison tool report for that pairing, not the marginal reach probability), and a **human round label** (e.g. "Round of 32", "Quarter-final") — never the internal match id — plus counts of how many picks are still alive vs. busted (picked team eliminated) vs. wrong (decided match lost), the boldness count, and the upset bonus. Points banked so far MAY be included but SHALL be clearly labelled as points-so-far against the total (not a verdict). The tool SHALL NOT include the projected (expected) final score, and SHALL NOT include the perfect-bracket survival probability — neither is user-interpretable as a verdict. The tool's input SHALL have an explicit, validated schema, and output SHALL be engine-sourced, never free-text the model could mistake for its own computation.

#### Scenario: Returns the grounded bracket evaluation

- **WHEN** the Scout needs facts about the user's bracket and picks are available
- **THEN** the tool returns per-pick statuses, head-to-head win probabilities vs. the predicted opponent, and round labels, the count of alive/busted/wrong picks, boldness, and upset bonus, computed by the engine

#### Scenario: Per-pick win is the head-to-head vs the predicted opponent

- **WHEN** the evaluation reports a pick's win probability
- **THEN** it is the picked team's head-to-head probability against its predicted opponent, matching the bracket card and the team-comparison tool — not the marginal probability of reaching the next round

#### Scenario: Picks identified by round, not match id

- **WHEN** the evaluation lists the user's picks
- **THEN** each pick carries a human round label (Round of 32 … Final) and the picked team, and the raw internal match id is not surfaced for the Analyst to quote

#### Scenario: No projected score or perfect-survival

- **WHEN** the evaluation is returned
- **THEN** it includes neither the projected (expected) final score nor the perfect-bracket survival probability, so neither can be quoted as a verdict

#### Scenario: Busted picks are surfaced honestly

- **WHEN** the bracket contains a pick whose team has already been eliminated
- **THEN** the tool reports that pick's status as busted and includes it in the busted count

#### Scenario: No picks available

- **WHEN** the tool is invoked but no picks are in context
- **THEN** it returns a clear "no bracket provided" result the Scout can relay, rather than inventing one

#### Scenario: Invalid picks handled

- **WHEN** the tool is called with picks that are not valid participants or reference unknown matches
- **THEN** it returns a tool error the Scout can relay, not an exception

### Requirement: Team strength and head-to-head tool

The system SHALL provide a Scout tool that resolves one or two teams by name and returns grounded strength facts: each team's rating-based strength and deep-run odds, and — for two teams — the model's head-to-head win probability. For a two-team comparison it SHALL also return the concrete model **drivers** behind that probability: each team's **Elo rating** and its **strength multiplier** (the mean-≈1 Poisson input the Elo maps to). This lets the Scout answer "who's better, X or Y?", "I don't know these teams", and "why is X favoured?" with engine numbers rather than opinion.

#### Scenario: Compare two teams

- **WHEN** the user asks who is more likely to win between two named teams
- **THEN** the tool returns the head-to-head win probability for that pairing from the model

#### Scenario: Drivers behind the head-to-head

- **WHEN** two teams are compared
- **THEN** the tool also returns each team's Elo rating and strength multiplier, so the favouritism can be explained from the actual model inputs

#### Scenario: Single-team strength

- **WHEN** the user asks how strong a team is or how far it is likely to go
- **THEN** the tool returns that team's rating-based standing and deep-run odds

#### Scenario: Forgiving name resolution

- **WHEN** the user names a team by a common name or abbreviation
- **THEN** the tool resolves it to the correct squad, or returns a not-found result rather than guessing

### Requirement: Bracket strategy tool

The system SHALL provide a Scout tool that, given the user's picks and pool size, returns the `bracket-strategy` output: the pool-fit assessment and the ranked swap suggestions (each naming the match, the pick to drop and take, and a grounded rationale). The tool's input SHALL be schema-validated, and its output SHALL be engine-produced, not free-text the model invents. It SHALL handle missing picks or pool size as a clear result.

#### Scenario: Returns grounded strategy

- **WHEN** the Scout needs strategic advice and picks + pool size are in context
- **THEN** the tool returns the pool-fit assessment and ranked swap suggestions from `bracket-strategy`

#### Scenario: Missing inputs handled

- **WHEN** the tool is invoked without picks or without a pool size
- **THEN** it returns a clear result indicating what's needed (e.g. "need your picks" / "how many in your pool?") rather than guessing

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

### Requirement: World Cup history tools

The Analyst SHALL have tools that surface the committed World Cup history dataset as compact, grounded facts, so it can answer historical questions without guessing. The tools SHALL include, at minimum: a nation's all-time World Cup **record**, the **head-to-head** World Cup meetings between two nations, the **top scorers** for a given tournament (or all-time when no year is given), and the list of **champions** by year. Tools SHALL reuse the existing forgiving team-name resolution and SHALL return only facts present in the dataset (no fabricated figures), including honestly representing gaps (e.g. limited 2022 scorer data). Tool outputs SHALL be compact summaries, not raw page dumps.

These tools provide **historical color only**: the Analyst SHALL NOT use World Cup history to produce, justify, or alter any WC2026 probability, projected finish, or pick recommendation — those continue to come exclusively from the engine-backed prediction/odds tools.

History tool outputs SHALL carry a **coverage note** ("asOf") stating the data ends at the 2022 World Cup and excludes the in-progress 2026 tournament, and the Analyst SHALL present all-time records, Golden Boots, champions, and nation records as of 2022 — never asserting a through-2022 record as the current record, and acknowledging it does not track the current tournament's goals or results.

#### Scenario: History question answered from the tool

- **WHEN** the user asks a World Cup history question (e.g. a nation's record, a head-to-head, past champions, or top scorers)
- **THEN** the Analyst calls the corresponding history tool and answers from its grounded facts rather than guessing

#### Scenario: Unknown or out-of-dataset history is not fabricated

- **WHEN** a history tool has no data for the request (or the source was sparse, e.g. 2022 per-match scorers)
- **THEN** the tool reports the absence and the Analyst says so rather than inventing a result

#### Scenario: History never drives 2026 numbers

- **WHEN** the user asks about a WC2026 pick, win probability, or projected finish
- **THEN** the answer's numbers come from the engine-backed odds/prediction tools, and World Cup history is used only as qualitative context, never as a source of those figures

#### Scenario: All-time records framed as of 2022

- **WHEN** the user asks for an all-time figure such as the World Cup's all-time top scorer
- **THEN** the Analyst answers from the tool and frames it as of the 2022 World Cup, noting it does not include the in-progress 2026 tournament rather than presenting it as the current record

### Requirement: Current-tournament top scorers

The Analyst SHALL have a tool that reports the **current tournament's** top scorers, derived from the live snapshot's goal events. The derivation SHALL aggregate goals per player across played and in-progress fixtures, **excluding own goals** from scorer credit, count assists, join each scorer to their nation, and rank by goals. The tool SHALL return a compact list (scorer, nation, goals, and assists) and SHALL report honestly when no goals have been recorded yet. These figures are descriptive color and SHALL NOT feed or alter any WC2026 probability, projected finish, or pick.

#### Scenario: Live Golden Boot race

- **WHEN** the user asks who is the top scorer of the (current) 2026 World Cup
- **THEN** the Analyst calls the current-top-scorers tool and answers from its aggregated goal events, ranked by goals, joined to nations

#### Scenario: Own goals excluded

- **WHEN** a goal event is an own goal
- **THEN** it is not credited to the player as a goal in the current-scorer ranking

#### Scenario: No goals yet

- **WHEN** no goals have been recorded in the tournament
- **THEN** the tool reports that none are recorded rather than inventing a scorer

### Requirement: Live all-time scoring record

The Analyst SHALL have a tool that reports the **all-time World Cup scoring record including the in-progress tournament**, computed by augmenting the committed historical top-scorer list (through 2022) with each player's 2026 goals, matched by nation and name. The tool SHALL report the current career leader and total, whether the previous (through-2022) record has been broken and by whom, and a short leaderboard. Because full career totals are only known for the historical top scorers, the live record board augments those known leaders (who alone can hold the record); a newcomer with only 2026 goals appears in the current-scorers tool, not as a career leader. The combined figures are color only and SHALL NOT feed any WC2026 probability, finish, or pick.

#### Scenario: Record broken during the tournament

- **WHEN** an active player's historical total plus their 2026 goals exceeds the previous all-time record
- **THEN** the tool reports the record as broken, names the player, and gives the new total

#### Scenario: Record intact

- **WHEN** no active player has surpassed the previous all-time total
- **THEN** the tool reports the standing record holder and total, with the current leaders' progress

#### Scenario: Live record supersedes the through-2022 figure

- **WHEN** the user asks whether the all-time scoring record has been broken (or who currently holds it)
- **THEN** the Analyst answers from the live record tool (which includes 2026), not from the historical through-2022 top-scorers tool

### Requirement: History vs. current scorer tools are distinct

The historical `get_wc_top_scorers` tool SHALL remain the **through-2022** source (a year's Golden Boot or the historical all-time list, carrying its as-of-2022 coverage note), and the Analyst SHALL route "current / this year / so far" scorer questions to the current-scorers tool and "has the record been broken / who holds it now" to the live record tool, reserving the historical tool for explicitly historical or per-year questions.

#### Scenario: Routing current vs. historical

- **WHEN** the user asks about scoring "this tournament" or "right now" versus "historically" or "in 2018"
- **THEN** the Analyst uses the current/record tools for the live questions and the historical tool for the past ones

