## ADDED Requirements

### Requirement: Strategic advice

The Scout SHALL answer "how do I win my pool?"-type questions by calling the bracket strategy tool and giving a brief, concrete recommendation from its output: the pool-fit assessment plus one or two specific swaps ("drop X, take Y — the model gives Y N%, but the upside is …"). The advice SHALL be grounded in the tool's output; when picks or pool size are missing, the Scout SHALL ask for them rather than inventing advice.

#### Scenario: Concrete pool-winning advice

- **WHEN** the user asks how to improve their bracket's chances of winning their pool
- **THEN** the Scout states whether the bracket is too safe or too risky for the pool size and names one or two specific swaps with grounded rationale

#### Scenario: Asks for what's needed

- **WHEN** the user asks for strategy but has no picks set or no pool size given
- **THEN** the Scout asks for the missing input rather than guessing

#### Scenario: Affirms a balanced bracket

- **WHEN** the bracket already fits the pool well
- **THEN** the Scout says so rather than inventing an unnecessary swap
