## 1. Tool — expose drivers

- [x] 1.1 `lib/scout/tools.ts`: add `strengths?: Map<number, number>` to `ScoutContext`; `compare_teams` returns `drivers` (Elo rating + strength multiplier) for each team.
- [x] 1.2 Pass strengths through: `BracketContext`/`buildContext` in `lib/scout/scout.ts` and `STRENGTHS` in `lib/server/predictor.ts` (`buildScoutBracket`).

## 2. Persona

- [x] 2.1 `lib/scout/prompt.ts`: when asked WHY a team is favoured, cite Elo + strength from `compare_teams`; never invent factors the model doesn't use; don't lead with tournament win %.

## 3. Tests + verify

- [x] 3.1 `lib/scout/bracketTools.test.ts`: compare_teams returns numeric Elo + strength drivers for both teams.
- [x] 3.2 Full suite green; live `/api/chat` "why are Netherlands the favorites?" cites Elo + strength, not invented factors.

## 4. Spec sync

- [x] 4.1 Confirm code matches the MODIFIED requirements in `specs/scout-tools/spec.md` and `specs/scout-conversation/spec.md`.
