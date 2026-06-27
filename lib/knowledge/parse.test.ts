import { describe, it, expect } from "vitest";
import { parseKnowledgeFile, selectNotes, type KnowledgeSnippet } from "./parse";

describe("parseKnowledgeFile", () => {
  it("splits prose by heading and extracts favor/fade signals", () => {
    const text = `favor: Morocco, Japan\nfade: Belgium\n\n## Morocco\nFlying under the radar.\n\n## Japan\nWell drilled.`;
    const { snippets, signals } = parseKnowledgeFile("a.md", text);
    expect(signals.favor).toEqual(["Morocco", "Japan"]);
    expect(signals.fade).toEqual(["Belgium"]);
    expect(snippets).toHaveLength(2);
    expect(snippets[0]).toMatchObject({ source: "a.md", heading: "Morocco" });
    // Signal directive lines are not part of the prose.
    expect(snippets.map((s) => s.text).join(" ")).not.toMatch(/favor:|fade:/i);
  });

  it("splits heading-less prose into paragraphs", () => {
    const { snippets, signals } = parseKnowledgeFile("b.txt", "First para.\n\nSecond para.");
    expect(snippets).toHaveLength(2);
    expect(snippets[0]!.text).toBe("First para.");
    expect(signals).toEqual({ favor: [], fade: [] });
  });
});

describe("selectNotes", () => {
  const snips: KnowledgeSnippet[] = [
    { source: "a", heading: "Morocco", text: "dark horse" },
    { source: "a", text: "Brazil are favorites" },
  ];
  it("returns matching snippets", () => {
    expect(selectNotes(snips, "Morocco")).toHaveLength(1);
  });
  it("returns nothing for no match", () => {
    expect(selectNotes(snips, "Uruguay")).toEqual([]);
  });
  it("caps results", () => {
    const many: KnowledgeSnippet[] = Array.from({ length: 10 }, (_, i) => ({ source: "a", text: `Morocco note ${i}` }));
    expect(selectNotes(many, "Morocco", { max: 3 })).toHaveLength(3);
  });
});
