## ADDED Requirements

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
