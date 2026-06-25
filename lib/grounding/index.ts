// Public entry point for the scenario-grounding layer. Pure functions that turn
// engine outputs into structured situations + plain-English narration, for use as
// LLM grounding context and as a standalone non-LLM explainer.

export { buildTeamSituation, buildGroupSituation } from "./situation";
export type {
  TeamSituation,
  GroupSituation,
  TeamFacts,
  GroupFacts,
  SituationOptions,
  GroupLiveFixture,
} from "./situation";
export { narrateTeam, narrateGroup } from "./narrate";
