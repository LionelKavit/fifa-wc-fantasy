## MODIFIED Requirements

### Requirement: Bracket-aware answers

The Scout SHALL answer questions about a user's bracket from the prediction-evaluation tool's grounded output, as a constructive advisor, and SHALL keep answers brief. For "how does my bracket look?"-type questions it SHALL give a short read: overall shape, what is in good shape, and at most the single riskiest still-alive pick (named by team and round) — then stop. It SHALL NOT volunteer swaps the user did not ask for; instead it MAY briefly offer to go deeper. Specific swap suggestions belong to an explicit advice/"how do I improve?" request, not the default look. The Scout SHALL refer to any pick by its team and round (e.g. "Canada in their Round of 32"), and SHALL NEVER mention internal match numbers/ids. It SHALL NEVER mention the projected (expected) score. Health claims SHALL be grounded in actual pick status: the Scout SHALL describe the bracket as busted/eliminated, or name a "culprit" pick, ONLY when the tool reports at least one busted or wrong pick; with none, it SHALL NOT say the bracket is eliminated or that a result has already broken the path. The Scout SHALL NOT equate a low survival or low points-banked with being eliminated, and SHALL NOT quote a perfect-survival %, the points-banked "X/80", the projected score, or a raw champion/head-to-head win % as a verdict. Every claim SHALL remain grounded in tool output per the "claims grounded, uncertainty honest" rule.

#### Scenario: Explains a pick's odds

- **WHEN** the user asks whether a pick is smart or how likely it is
- **THEN** the Scout reports that pick's model probability and frames it as a probability

#### Scenario: Brief, plain read of a healthy bracket

- **WHEN** the user asks how their bracket looks and the evaluation shows no busted or wrong picks
- **THEN** the Scout gives a short, encouraging read (overall shape, what's strong, the single riskiest live pick by team and round) and stops — without volunteering swaps, citing a projected score, mentioning a match number, or calling the bracket eliminated — and MAY offer to go deeper

#### Scenario: Picks named by team and round

- **WHEN** the Scout refers to any specific pick
- **THEN** it identifies it by team and round (e.g. "England in the Round of 16"), never by an internal match number

#### Scenario: Swaps only on request

- **WHEN** the user explicitly asks how to improve their bracket or for a deeper look
- **THEN** the Scout offers one or two concrete swaps with grounded reasons; otherwise it does not volunteer them

#### Scenario: Honest about real damage

- **WHEN** the evaluation reports one or more busted/wrong picks
- **THEN** the Scout names what actually busted (by team and round, from the tool) and, if useful, a concrete fix — grounding any "your path is hurt" statement in those real busted/wrong picks, not in a low survival number

#### Scenario: Team knowledge on request

- **WHEN** the user says they don't know a team or asks who is better between two teams
- **THEN** the Scout uses the team-strength/head-to-head tool and answers with the grounded probability
