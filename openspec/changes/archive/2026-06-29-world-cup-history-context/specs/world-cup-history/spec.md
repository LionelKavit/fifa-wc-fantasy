## ADDED Requirements

### Requirement: Committed World Cup history dataset

The system SHALL include a committed, trusted dataset of World Cup history covering every tournament from 1930 to 2022, generated **once offline** from the RSSSF full match archives and stored in the repository. The runtime SHALL NOT fetch the source pages — it loads only the committed dataset. The dataset SHALL record its provenance (source and generation date), attribute RSSSF, and state its **coverage**: it ends at the 2022 World Cup and does NOT include the in-progress 2026 tournament (so all-time records, Golden Boots, head-to-heads, and per-nation records are as of 2022). Per tournament it SHALL contain: the host, the champion and runner-up (with the final score), the match results (stage, the two teams, and the score), and the tournament's Golden Boot. Match results SHALL cover the large majority of matches (about 99%), with a small, documented residual of obscure replay/playoff/edge matches omitted; group standings and per-nation records are DERIVED from the match results rather than stored separately. It SHALL NOT include lineups, substitutions, cards, referees, or minute-level per-match goalscorers.

#### Scenario: All tournaments present, loaded not fetched

- **WHEN** the history dataset is loaded
- **THEN** it provides all World Cup tournaments 1930–2022 from the committed file, with no network fetch at runtime

#### Scenario: Per-tournament facts available

- **WHEN** a tournament's record is read
- **THEN** it exposes the host, champion, runner-up, final score, match results (stage, teams, score), and the Golden Boot

#### Scenario: Sparse source contributes what it has

- **WHEN** a source page lacks per-match detail (e.g. 2022)
- **THEN** the dataset still records that tournament's results and its curated champion/Golden Boot, and any gap is represented honestly rather than fabricated

#### Scenario: Coverage is explicit and excludes the in-progress tournament

- **WHEN** the dataset (or a derived aggregate) is consumed
- **THEN** it exposes a coverage note stating the data ends at the 2022 World Cup and does not include the in-progress 2026 tournament, so a through-2022 record is never presented as the current record

### Requirement: Derived all-time aggregates

The system SHALL derive, from the committed dataset, aggregate views computed by pure functions and cached: each nation's all-time World Cup **record** (tournament appearances, titles, finals reached, matches won/drawn/lost, goals for/against, and best finish); and a **head-to-head index** of World Cup meetings between any two nations (each meeting's year, stage, score, and winner). A curated **all-time top-scorer list** is provided in the dataset (the per-tournament Golden Boots are also curated). Aggregates SHALL be a deterministic function of the dataset (no hidden state).

#### Scenario: Team all-time record

- **WHEN** a nation's all-time record is requested
- **THEN** it returns appearances, titles, finals/semifinals reached, W-D-L, goals for/against, and best finish, computed from the dataset

#### Scenario: Head-to-head meetings

- **WHEN** two nations' World Cup head-to-head is requested
- **THEN** it returns the count and each meeting (year, stage, score)

#### Scenario: Top scorers available by year or all-time

- **WHEN** a tournament year's top scorer is requested, or the all-time top scorers
- **THEN** it returns that year's curated Golden Boot, or the curated all-time top-scorer list

### Requirement: Historical nation identity is explicit

The dataset SHALL store nation names as the source records them. A documented alias map SHALL merge only the widely-accepted successor — **West Germany into Germany** — so a query for Germany includes its pre-unification titles. Other historical entities (e.g. East Germany, Soviet Union, Yugoslavia, Czechoslovakia, Serbia & Montenegro) SHALL be kept distinct, and any record that spans a predecessor name SHALL be labelled as such rather than silently merged.

#### Scenario: Accepted successor merged

- **WHEN** Germany's all-time record is requested
- **THEN** it includes the West Germany era (e.g. the 1954/1974/1990 titles)

#### Scenario: Other predecessors kept distinct and labelled

- **WHEN** a record involves a former nation (e.g. Soviet Union or Yugoslavia)
- **THEN** it is reported under that historical name, not silently folded into a current nation
