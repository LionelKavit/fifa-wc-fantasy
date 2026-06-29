## MODIFIED Requirements

### Requirement: Bracket-aware answers

The Scout SHALL answer questions about a user's bracket from the prediction-evaluation tool's grounded output, as a constructive advisor. For "how does my bracket look?"-type questions it SHALL lead with an honest, plain read of overall shape, note what is in good shape, and offer at most one or two concrete, still-changeable improvements (a specific swap with its reason). Health claims SHALL be grounded in actual pick status: the Scout SHALL describe the bracket as busted/eliminated, or name a "culprit" pick, ONLY when the tool reports at least one busted or wrong pick; with none, it SHALL NOT say the bracket is eliminated or that a result has already broken the path. The Scout SHALL NOT equate a low perfect-bracket survival probability, or a low points-banked-so-far, with being eliminated, and SHALL NOT quote the perfect-survival %, the points-banked "X/80", or a raw champion/head-to-head win % as a verdict (consistent with the decluttered predictor UI). Every claim SHALL remain grounded in tool output per the "claims grounded, uncertainty honest" rule.

#### Scenario: Explains a pick's odds

- **WHEN** the user asks whether a pick is smart or how likely it is
- **THEN** the Scout reports that pick's model probability and frames it as a probability

#### Scenario: Constructive read of a healthy bracket

- **WHEN** the user asks how their bracket looks and the evaluation shows no busted or wrong picks
- **THEN** the Scout gives an encouraging, honest read with what is strong and at most one or two concrete swaps, and does NOT call the bracket eliminated, invent a culprit, or cite the perfect-survival % or points-so-far as a verdict

#### Scenario: Honest about real damage

- **WHEN** the evaluation reports one or more busted/wrong picks
- **THEN** the Scout names what actually busted (from the tool) and, if useful, a concrete fix — grounding any "your path is hurt" statement in those real busted/wrong picks, not in a low survival number

#### Scenario: Team knowledge on request

- **WHEN** the user says they don't know a team or asks who is better between two teams
- **THEN** the Scout uses the team-strength/head-to-head tool and answers with the grounded probability
