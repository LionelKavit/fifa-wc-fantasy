## ADDED Requirements

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
