import { describe, it, expect } from "vitest";
import {
  PlayersPayloadSchema,
  SquadsPayloadSchema,
  validate,
  DataValidationError,
} from "./schema";

const validSquad = {
  id: 1,
  name: "Algeria",
  abbr: "ALG",
  group: "j",
  isEliminated: false,
};

describe("validation", () => {
  it("passes when payload contains unknown extra fields", () => {
    const withExtra = [{ ...validSquad, somethingNew: 123, nested: { x: 1 } }];
    const result = validate(SquadsPayloadSchema, withExtra, "squads.json");
    expect(result[0]!.abbr).toBe("ALG");
    // extra field is ignored, not present on the typed result usage
  });

  it("fails with endpoint + field path when a required field is missing", () => {
    const { group, ...missingGroup } = validSquad;
    void group;
    expect(() => validate(SquadsPayloadSchema, [missingGroup], "squads.json")).toThrow(
      DataValidationError,
    );
    try {
      validate(SquadsPayloadSchema, [missingGroup], "squads.json");
    } catch (e) {
      const err = e as DataValidationError;
      expect(err.endpoint).toBe("squads.json");
      expect(err.fieldPath).toBe("0.group");
    }
  });

  it("fails when a required field has the wrong type", () => {
    const badPlayer = [
      {
        id: 1,
        firstName: "A",
        lastName: "B",
        knownName: null,
        squadId: "not-a-number",
        position: "DEF",
        price: 4.5,
        status: "playing",
        percentSelected: 1.1,
        stats: { form: 0.7, totalPoints: 2 },
      },
    ];
    try {
      validate(PlayersPayloadSchema, badPlayer, "players.json");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(DataValidationError);
      expect((e as DataValidationError).fieldPath).toBe("0.squadId");
    }
  });
});
