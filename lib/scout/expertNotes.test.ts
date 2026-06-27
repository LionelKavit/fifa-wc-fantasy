import { describe, it, expect } from "vitest";
import { executeTool, type ScoutContext } from "./tools";
import type { KnowledgeSnippet } from "../knowledge/parse";

// Only ctx.expertNotes is read by this tool; a partial context suffices.
const ctx = (expertNotes: KnowledgeSnippet[]): ScoutContext => ({ expertNotes }) as unknown as ScoutContext;

describe("get_expert_notes tool", () => {
  it("reports none when there are no sources", () => {
    const r = executeTool("get_expert_notes", { topic: "Morocco" }, ctx([]));
    expect(r.isError).toBe(false);
    expect(JSON.parse(r.output).available).toBe(false);
  });

  it("returns labeled snippets when present", () => {
    const r = executeTool("get_expert_notes", { topic: "Morocco" }, ctx([{ source: "a.md", heading: "Morocco", text: "dark horse" }]));
    expect(r.isError).toBe(false);
    const out = JSON.parse(r.output);
    expect(out.available).toBe(true);
    expect(out.disclaimer).toMatch(/unverified/i);
    expect(out.notes[0].text).toBe("dark horse");
  });

  it("requires a topic", () => {
    const r = executeTool("get_expert_notes", {}, ctx([{ source: "a", text: "x" }]));
    expect(r.isError).toBe(true);
  });
});
