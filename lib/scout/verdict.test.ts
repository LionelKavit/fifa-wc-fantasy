import { describe, it, expect } from "vitest";
import { verdictNote } from "./verdict";
import type { VerdictFacts } from "../predictor/verdictText";

const facts: VerdictFacts = {
  winProbability: 0.12,
  chalkWinProbability: 0.06,
  expectedFinish: 5,
  poolSize: 20,
  pointsRange: { p10: 13, p50: 22, p90: 40, mean: 24 },
};

// A fake SDK client that returns fixed message content.
const fakeClient = (text: unknown[] | string) =>
  ({
    messages: {
      create: async () => ({ content: typeof text === "string" ? [{ type: "text", text }] : text }),
    },
  }) as never;

describe("verdictNote", () => {
  it("falls back to the template (source 'template') when keyless", async () => {
    const note = await verdictNote(facts, { apiKey: null });
    expect(note.source).toBe("template");
    expect(note.text).toMatch(/pool of 20/);
  });

  it("uses the model text (source 'llm') and strips markdown when a client is injected", async () => {
    const note = await verdictNote(facts, {
      client: fakeClient("**A live shot** to win your pool — `better` than chalk."),
    });
    expect(note.source).toBe("llm");
    expect(note.text).toBe("A live shot to win your pool — better than chalk.");
    expect(note.text).not.toMatch(/[*`]/);
  });

  it("falls back to the template when the model returns empty text", async () => {
    const note = await verdictNote(facts, { client: fakeClient([]) });
    expect(note.source).toBe("template");
  });

  it("includes expert notes in the prompt when provided", async () => {
    let captured: Record<string, unknown> | undefined;
    const fake = {
      messages: { create: async (p: Record<string, unknown>) => ((captured = p), { content: [{ type: "text", text: "ok" }] }) },
    } as never;
    await verdictNote(facts, { client: fake, notes: [{ source: "a.md", heading: "Morocco", text: "dark horse pick" }] });
    const msg = JSON.stringify(captured!.messages);
    expect(msg).toMatch(/Expert notes/);
    expect(msg).toMatch(/dark horse pick/i);
  });

  it("omits the notes block when none are provided", async () => {
    let captured: Record<string, unknown> | undefined;
    const fake = {
      messages: { create: async (p: Record<string, unknown>) => ((captured = p), { content: [{ type: "text", text: "ok" }] }) },
    } as never;
    await verdictNote(facts, { client: fake });
    expect(JSON.stringify(captured!.messages)).not.toMatch(/Expert notes/);
  });
});
