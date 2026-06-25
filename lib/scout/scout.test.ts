import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { askScout, type StreamingClient } from "./scout";
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
const report = advancementProbabilities(snap, { trials: 500, seed: 1 });
const base = { snapshot: snap, report };

describe("deterministic fallback (no API key)", () => {
  it("answers a team question from grounded narration", async () => {
    const ans = await askScout("What does Mexico need to advance?", { ...base, apiKey: null });
    expect(ans.source).toBe("deterministic");
    expect(ans.text).toContain("Mexico");
    expect(ans.text).toContain("secured"); // Mexico has clinched in the recorded snapshot
  });

  it("answers a group question from grounded narration", async () => {
    const ans = await askScout("How is Group A shaping up?", { ...base, apiKey: null });
    expect(ans.source).toBe("deterministic");
    expect(ans.text).toContain("Group A");
  });

  it("returns a graceful message when nothing resolves", async () => {
    const ans = await askScout("hey there, what's up?", { ...base, apiKey: null });
    expect(ans.source).toBe("deterministic");
    expect(ans.text.toLowerCase()).toContain("naming a team");
  });

  it("resolves a follow-up from prior context when the question names no subject", async () => {
    const ans = await askScout("and what are their chances?", {
      ...base,
      apiKey: null,
      history: [
        { role: "user", content: "What does Mexico need?" },
        { role: "assistant", content: "Mexico are through." },
      ],
    });
    expect(ans.text).toContain("Mexico");
  });

  it("answers about the team actually named, not the one in history", async () => {
    // Regression: "what does korea need?" must not return the Mexico answer.
    const ans = await askScout("what does korea need?", {
      ...base,
      apiKey: null,
      history: [
        { role: "user", content: "What does Mexico need?" },
        { role: "assistant", content: "Mexico are through." },
      ],
    });
    expect(ans.text).toContain("Korea");
    expect(ans.text).not.toContain("Mexico");
  });

  it("does not dredge history for a greeting", async () => {
    const ans = await askScout("hello", {
      ...base,
      apiKey: null,
      history: [
        { role: "user", content: "What does Mexico need?" },
        { role: "assistant", content: "Mexico are through." },
      ],
    });
    expect(ans.text.toLowerCase()).toContain("naming a team"); // the graceful default
    expect(ans.text).not.toContain("secured a top-2"); // not the Mexico situation
  });
});

describe("LLM tool-use loop (mocked streaming client)", () => {
  function fakeStream(events: unknown[], finalMessage: unknown) {
    return {
      async *[Symbol.asyncIterator]() {
        for (const e of events) yield e;
      },
      finalMessage: async () => finalMessage,
    };
  }

  it("runs a tool call, feeds the result back, and returns the final answer", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = {
      messages: {
        stream(params: Record<string, unknown>) {
          calls.push(params);
          if (calls.length === 1) {
            // First turn: the model calls a tool.
            return fakeStream([], {
              stop_reason: "tool_use",
              content: [{ type: "tool_use", id: "tu_1", name: "get_team_situation", input: { team: "Mexico" } }],
            });
          }
          // Second turn: the model produces the final streamed answer.
          const text = "Mexico are already through to the Round of 32.";
          return fakeStream(
            [{ type: "content_block_delta", delta: { type: "text_delta", text } }],
            { stop_reason: "end_turn", content: [{ type: "text", text }] },
          );
        },
      },
    } as unknown as StreamingClient;

    const ans = await askScout("What about Mexico?", { ...base, client });

    expect(ans.source).toBe("llm");
    expect(ans.text).toContain("Mexico are already through");
    expect(calls).toHaveLength(2); // tool turn + final turn

    // The second request must carry the tool_result for tu_1 back to the model.
    expect(JSON.stringify(calls[1]!.messages)).toContain("tu_1");
  });

  it("threads prior conversation turns into the model request", async () => {
    let firstParams: Record<string, unknown> | undefined;
    const client = {
      messages: {
        stream(params: Record<string, unknown>) {
          firstParams ??= params;
          const text = "ok";
          return fakeStream(
            [{ type: "content_block_delta", delta: { type: "text_delta", text } }],
            { stop_reason: "end_turn", content: [{ type: "text", text }] },
          );
        },
      },
    } as unknown as StreamingClient;

    await askScout("what about their group?", {
      ...base,
      client,
      history: [
        { role: "user", content: "What does Mexico need?" },
        { role: "assistant", content: "Mexico are through to the Round of 32." },
      ],
    });

    const sent = JSON.stringify(firstParams!.messages);
    expect(sent).toContain("What does Mexico need?"); // history is included...
    expect(sent).toContain("what about their group?"); // ...ahead of the new question
  });

  it("terminates immediately when the first turn is already a final answer", async () => {
    let count = 0;
    const client = {
      messages: {
        stream() {
          count++;
          const text = "Ask me about a team or group.";
          return fakeStream(
            [{ type: "content_block_delta", delta: { type: "text_delta", text } }],
            { stop_reason: "end_turn", content: [{ type: "text", text }] },
          );
        },
      },
    } as unknown as StreamingClient;

    const ans = await askScout("hi", { ...base, client });
    expect(count).toBe(1);
    expect(ans.text).toContain("Ask me about");
  });
});
