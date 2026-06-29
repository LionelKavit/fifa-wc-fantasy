// Runtime validation of the raw public endpoints. Schemas cover ONLY the fields
// the app depends on and `.passthrough()` everything else, so additive drift is
// tolerated while a missing/retyped required field fails loud with its path.
//
// These raw shapes are internal — only normalize.ts consumes them. They are never
// exported from the data layer's public entry point (index.ts).

import { z } from "zod";

const PositionSchema = z.enum(["GK", "DEF", "MID", "FWD"]);
const StageSchema = z.enum(["GROUP", "R32", "R16", "QF", "SF", "F"]);

export const RawPlayerSchema = z
  .object({
    id: z.number(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    knownName: z.string().nullable(),
    squadId: z.number(),
    position: PositionSchema,
    price: z.number(),
    status: z.string(),
    percentSelected: z.number(),
    stats: z
      .object({
        form: z.number(),
        totalPoints: z.number(),
      })
      .passthrough(),
  })
  .passthrough();

export const RawSquadSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    abbr: z.string(),
    group: z.string(),
    isEliminated: z.boolean(),
  })
  .passthrough();

const RawGoalSchema = z
  .object({
    playerId: z.number(),
    assistId: z.number().nullable(),
    isOwnGoal: z.boolean(),
  })
  .passthrough();

export const RawFixtureSchema = z
  .object({
    id: z.number(),
    status: z.string(),
    date: z.string(),
    homeSquadId: z.number(),
    awaySquadId: z.number(),
    homeScore: z.number().nullable(),
    awayScore: z.number().nullable(),
    venueName: z.string().nullable().optional(),
    homeGoalScorersAssists: z.array(RawGoalSchema).nullable().optional(),
    awayGoalScorersAssists: z.array(RawGoalSchema).nullable().optional(),
  })
  .passthrough();

export const RawRoundSchema = z
  .object({
    id: z.number(),
    stage: StageSchema,
    status: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    tournaments: z.array(RawFixtureSchema),
  })
  .passthrough();

export const PlayersPayloadSchema = z.array(RawPlayerSchema);
export const SquadsPayloadSchema = z.array(RawSquadSchema);
export const RoundsPayloadSchema = z.array(RawRoundSchema);

export type RawPlayer = z.infer<typeof RawPlayerSchema>;
export type RawSquad = z.infer<typeof RawSquadSchema>;
export type RawRound = z.infer<typeof RawRoundSchema>;

/** Thrown when a payload is missing or has retyped a field the app depends on. */
export class DataValidationError extends Error {
  constructor(
    public endpoint: string,
    public fieldPath: string,
    public detail: string,
  ) {
    super(`Validation failed for ${endpoint} at "${fieldPath}": ${detail}`);
    this.name = "DataValidationError";
  }
}

/** Validate `data` against `schema`, throwing a DataValidationError naming the
 * endpoint and the first offending field path on failure. */
export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown,
  endpoint: string,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0]!;
    const path = issue.path.length ? issue.path.join(".") : "(root)";
    throw new DataValidationError(endpoint, path, issue.message);
  }
  return result.data;
}
