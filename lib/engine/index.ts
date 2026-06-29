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
export { simulate, DEFAULT_TRIALS, DEFAULT_LIVE_REMAINING_LAMBDA, DEFAULT_KO_EXTRA_TIME_LAMBDA } from "./montecarlo";
export type { SimulateOptions, SimulationResult, StageReach, MatchupCount } from "./montecarlo";
export { knockoutProbabilities } from "./knockoutProbability";
export type { KnockoutOddsReport, KnockoutTeamOdds, MatchupOdds, KnockoutMethod } from "./knockoutProbability";
export { allocateThirds } from "./thirdPlaceAllocation";
export { R32_LAYOUT, KO_LAYOUT, THIRD_PLACE_SLOTS } from "./bracketLayout";
export { hasLiveFixtures, liveFixtures, liveFixturesForGroup, type LiveFixture } from "./live";
export { rankThirdPlaced, type ThirdPlaceResult } from "./thirdPlace";
export { buildBracket, projectR32, type R32Projection, type FinishProbs } from "./bracket";
export {
  teamRecord,
  headToHead as wcHeadToHead,
  topScorers as wcTopScorers,
  champions as wcChampions,
  resolveNation as wcResolveNation,
  historyMeta as wcHistoryMeta,
  WC_HISTORY_COVERAGE,
  type WcRecord,
  type WcHeadToHead,
  type WcChampion,
} from "./worldCupHistory";
export {
  currentTopScorers,
  allTimeScoringRecord,
  type CurrentScorer,
  type CareerScorer,
  type ScoringRecord,
} from "./currentScorers";
export {
  emptyPrediction,
  predictedParticipants,
  isPredictionLocked,
  decidedWinners,
  isMatchDecided,
  withDecided,
  pick,
  clear,
  completeness,
  derivePrediction,
} from "./prediction";
export {
  scorePrediction,
  DEFAULT_STAGE_WEIGHTS,
  UPSET_MULTIPLIER_CUTOFFS,
  upsetMultiplier,
  type ScoreOptions,
  type UpsetCutoffs,
} from "./predictionScore";
export { compareToModel, DEFAULT_UPSET_FACTOR, type CompareOptions } from "./predictionVsModel";
export {
  evaluatePoolFinish,
  pickLeverage,
  PUBLIC_CHALK_GAMMA,
  type PoolFinishOptions,
  type PoolFinishResult,
  type PointsRange,
  type PickLeverage,
  type MatchupWinProb,
} from "./poolFinish";
export {
  generateBracket,
  recommendRisk,
  type RiskLevel,
  type GenerateBracketOptions,
  type RiskRecommendation,
  type StageWinProb,
} from "./bracketGenerator";
export { generateByLeverage, type LeverageGenerateOptions, type LeverageResult } from "./leverageGenerator";
export { analyzeStrategy } from "./bracketStrategy";
export type { StrategyAssessment, SwapSuggestion, StrategyVerdict, StrategyOptions } from "./bracketStrategy";
export { createPoissonModel, poissonHeadToHead, type OutcomeModel, type PoissonModelOptions, type HeadToHeadOptions } from "./outcome";
export { eloStrengths, hostTeamIds, DEFAULT_ELO_K, HOST_ABBRS } from "./strength";
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
  KnockoutStage,
  GroupPosition,
  Feeder,
  BracketTeamRef,
  BracketSlot,
  BracketMatch,
  Bracket,
  Prediction,
  PredictionCompleteness,
  PredictionView,
  PickStatus,
  StageWeights,
  PickScore,
  PredictionScore,
  PickModelInfo,
  ModelComparison,
} from "./types";
