import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolveTeam, resolveGroup, executeTool, type ScoutContext } from "./tools";
import { advancementProbabilities } from "../engine";
import { normalize, type RawPayloads } from "../data/normalize";
import { PlayersPayloadSchema, SquadsPayloadSchema, RoundsPayloadSchema, validate } from "../data/schema";

function loadSnapshot() {
  const load = (name: string) =>
    JSON.parse(readFileSync(new URL(`../data/__fixtures__/${name}.json`, import.meta.url), "utf8"));
  const raw: RawPayloads = {
    players: validate(PlayersPayloadSchema, load("players"), "players.json"),
    squads: validate(SquadsPayloadSchema, load("squads"), "squads.json"),
    rounds: validate(RoundsPayloadSchema, load("rounds"), "rounds.json"),
  };
  return normalize(raw, "2026-06-24T00:00:00Z");
}

const snap = loadSnapshot();
const ctx: ScoutContext = { snapshot: snap, report: advancementProbabilities(snap, { trials: 500, seed: 1 }) };

describe("name resolution", () => {
  it("resolves teams by abbreviation, exact name, and within a question", () => {
    expect(resolveTeam(snap, "MEX")?.abbr).toBe("MEX");
    expect(resolveTeam(snap, "mexico")?.abbr).toBe("MEX");
    expect(resolveTeam(snap, "What does Mexico need to go through?")?.abbr).toBe("MEX");
    expect(resolveTeam(snap, "korea")?.abbr).toBe("KOR"); // matches 'Korea Republic'
  });

  it("resolves a multi-word team name from within a free-form question", () => {
    // Regression: "korea" must match 'Korea Republic' even inside a sentence.
    expect(resolveTeam(snap, "what does korea need?")?.abbr).toBe("KOR");
  });

  it("does not resolve a team from a greeting or chit-chat", () => {
    expect(resolveTeam(snap, "hello")).toBeNull();
    expect(resolveTeam(snap, "yolo")).toBeNull();
    expect(resolveTeam(snap, "can you help me?")).toBeNull(); // 'can' (lowercase) ≠ Canada
  });

  it("returns null for an unknown team", () => {
    expect(resolveTeam(snap, "Atlantis")).toBeNull();
  });

  it("resolves groups from 'Group X', a bare letter, and within text", () => {
    expect(resolveGroup(snap, "Group A")).toBe("a");
    expect(resolveGroup(snap, "f")).toBe("f");
    expect(resolveGroup(snap, "how does group c look")).toBe("c");
    expect(resolveGroup(snap, "Group Z")).toBeNull();
  });
});

describe("tool execution", () => {
  it("returns a compact grounded team situation", () => {
    const r = executeTool("get_team_situation", { team: "Mexico" }, ctx);
    expect(r.isError).toBe(false);
    const data = JSON.parse(r.output);
    expect(data.team).toBe("Mexico");
    expect(data.status).toBe("clinched");
    expect(data.summary).toContain("Mexico"); // grounded one-liner
    // compact: no heavy fields like the full ownMatch / table
    expect(data.ownMatch).toBeUndefined();
  });

  it("returns a compact grounded group situation", () => {
    const r = executeTool("get_group_situation", { group: "Group A" }, ctx);
    expect(r.isError).toBe(false);
    const data = JSON.parse(r.output);
    expect(data.teams).toHaveLength(4);
    expect(data.teams[0]).toHaveProperty("status");
    expect(data.table).toBeUndefined(); // compact: full table omitted
  });

  it("reports not-found rather than guessing for an unknown team", () => {
    const r = executeTool("get_team_situation", { team: "Atlantis" }, ctx);
    expect(r.isError).toBe(false);
    expect(JSON.parse(r.output).found).toBe(false);
  });

  it("returns a tool error for a schema-invalid call", () => {
    const r = executeTool("get_team_situation", {}, ctx);
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.output).error).toBeTruthy();
  });

  it("returns a tool error for an unknown tool", () => {
    expect(executeTool("frobnicate", {}, ctx).isError).toBe(true);
  });
});
