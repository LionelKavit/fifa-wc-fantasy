// Public entry point for the deterministic scenario engine (Layer 1).
// Pure functions over a TournamentSnapshot from the data-ingestion layer.

export { computeGroupStandings, buildOrderedRows, groupMatchResults, type MatchResult } from "./standings";
export { computeQualificationVerdicts } from "./verdict";
export { splitGroupFixtures, type RemainingMatch } from "./scenarios";

// Probabilistic engine (Layer 2).
export { advancementProbabilities } from "./probability";
export type {
  AdvancementReport,
  TeamAdvancement,
  ConditionalProbability,
  ProbabilityMethod,
} from "./probability";
export { simulate, DEFAULT_TRIALS } from "./montecarlo";
export type { SimulateOptions, SimulationResult } from "./montecarlo";
export { rankThirdPlaced, type ThirdPlaceResult } from "./thirdPlace";
export { createPoissonModel, type OutcomeModel, type PoissonModelOptions } from "./outcome";
export { mulberry32, samplePoisson, type Rng } from "./rng";

export type {
  StandingRow,
  GroupTable,
  TopTwoVerdict,
  AdvancementStatus,
  OutcomeEffect,
  OwnMatchConditions,
  TeamQualification,
  GroupQualification,
} from "./types";
