import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { GET as getGroups } from "./groups/route";
import { GET as getGroup } from "./groups/[id]/route";
import { POST as postChat } from "./chat/route";
import { __setTournamentDataForTests, type TournamentData } from "../../lib/server/tournament";
import { advancementProbabilities } from "../../lib/engine";
import { normalize, type RawPayloads } from "../../lib/data/normalize";
import { PlayersPayloadSchema, SquadsPayloadSchema, RoundsPayloadSchema, validate } from "../../lib/data/schema";

function loadData(): TournamentData {
  const load = (name: string) =>
    JSON.parse(readFileSync(new URL(`../../lib/data/__fixtures__/${name}.json`, import.meta.url), "utf8"));
  const raw: RawPayloads = {
    players: validate(PlayersPayloadSchema, load("players"), "players.json"),
    squads: validate(SquadsPayloadSchema, load("squads"), "squads.json"),
    rounds: validate(RoundsPayloadSchema, load("rounds"), "rounds.json"),
  };
  const snapshot = normalize(raw, "2026-06-24T00:00:00Z");
  const report = advancementProbabilities(snapshot, { trials: 500, seed: 1 });
  return { snapshot, report, computedAt: Date.now(), live: false };
}

// A variant where group A's last fixture is in progress (CZE vs MEX, 1–1).
function loadDataWithLiveFixture(): TournamentData {
  const base = loadData();
  const snapshot = structuredClone(base.snapshot);
  const a = new Set(snapshot.groups.find((g) => g.id === "a")!.teams.map((t) => t.id));
  const fx = snapshot.fixtures.find(
    (f) => f.stage === "GROUP" && f.status === "scheduled" && a.has(f.homeTeamId) && a.has(f.awayTeamId),
  )!;
  fx.status = "live";
  fx.homeScore = 1;
  fx.awayScore = 1;
  const report = advancementProbabilities(snapshot, { trials: 500, seed: 1 });
  return { snapshot, report, computedAt: Date.now(), live: true };
}

const data = loadData();

function chatRequest(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeAll(() => {
  delete process.env.ANTHROPIC_API_KEY; // force the deterministic path
});
beforeEach(() => __setTournamentDataForTests(data));

describe("GET /api/groups", () => {
  it("returns all 12 groups with standings and advancement status", async () => {
    const res = await getGroups();
    const json = await res.json();
    expect(json.groups).toHaveLength(12);
    const a = json.groups.find((g: { groupId: string }) => g.groupId === "a");
    expect(a.table).toHaveLength(4);
    const mex = a.teams.find((t: { abbr: string }) => t.abbr === "MEX");
    expect(mex.advancement).toBe("clinched");
  });
});

describe("GET /api/groups (live state)", () => {
  it("flags live and returns a provisional view for the group with an in-progress fixture", async () => {
    __setTournamentDataForTests(loadDataWithLiveFixture());
    const res = await getGroups();
    const json = await res.json();
    expect(json.live).toBe(true);
    const a = json.groups.find((g: { groupId: string }) => g.groupId === "a");
    expect(a.provisional).toBe(true);
    expect(a.liveFixtures.length).toBeGreaterThanOrEqual(1);
    // a non-live group should not be flagged provisional
    const other = json.groups.find((g: { provisional: boolean }) => g.provisional === false);
    expect(other).toBeDefined();
  });
});

describe("GET /api/groups/[id]", () => {
  it("returns a group's grounded situation", async () => {
    const res = await getGroup(new Request("http://localhost/api/groups/a"), {
      params: Promise.resolve({ id: "a" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.groupId).toBe("a");
    expect(json.teams).toHaveLength(4);
  });

  it("404s for an unknown group", async () => {
    const res = await getGroup(new Request("http://localhost/api/groups/z"), {
      params: Promise.resolve({ id: "z" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/chat", () => {
  it("answers a question (deterministic) and streams text", async () => {
    const res = await postChat(chatRequest({ question: "What does Mexico need?" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-scout-source")).toBe("deterministic");
    const text = await res.text();
    expect(text).toContain("Mexico");
  });

  it("threads conversation history", async () => {
    const res = await postChat(
      chatRequest({
        question: "and what about their chances?",
        history: [
          { role: "user", content: "What does Mexico need?" },
          { role: "assistant", content: "Mexico are through." },
        ],
      }),
    );
    const text = await res.text();
    expect(text).toContain("Mexico");
  });

  it("400s when the question is missing", async () => {
    const res = await postChat(chatRequest({ history: [] }));
    expect(res.status).toBe(400);
  });

  it("400s on invalid JSON", async () => {
    const res = await postChat(chatRequest("not json"));
    expect(res.status).toBe(400);
  });
});
