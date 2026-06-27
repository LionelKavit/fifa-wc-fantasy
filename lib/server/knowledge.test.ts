import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadKnowledge, __setKnowledgeDirForTests, __resetKnowledgeCacheForTests } from "./knowledge";

describe("loadKnowledge", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "knowledge-"));
    __setKnowledgeDirForTests(dir);
  });
  afterEach(() => {
    __setKnowledgeDirForTests(null);
    rmSync(dir, { recursive: true, force: true });
  });

  it("loads markdown snippets + signals, excludes README, skips PDF", () => {
    writeFileSync(join(dir, "notes.md"), "favor: Morocco\n\n## Morocco\nDark horse.");
    writeFileSync(join(dir, "README.md"), "# docs\nfavor: ShouldBeIgnored");
    writeFileSync(join(dir, "guide.pdf"), "binary-ish");
    __resetKnowledgeCacheForTests();

    const k = loadKnowledge();
    expect(k.signals.favor).toEqual(["Morocco"]); // README's favor is ignored
    expect(k.snippets.some((s) => s.heading === "Morocco")).toBe(true);
    expect(k.snippets.every((s) => s.source !== "README.md")).toBe(true);
    expect(k.snippets.every((s) => s.source !== "guide.pdf")).toBe(true);
  });

  it("yields nothing for an empty directory", () => {
    const k = loadKnowledge();
    expect(k.snippets).toEqual([]);
    expect(k.signals).toEqual({ favor: [], fade: [] });
  });

  it("caches the parsed result", () => {
    writeFileSync(join(dir, "a.md"), "## X\none");
    __resetKnowledgeCacheForTests();
    const first = loadKnowledge();
    writeFileSync(join(dir, "b.md"), "## Y\ntwo"); // added after the first load
    const second = loadKnowledge(); // served from cache → b.md not seen
    expect(second).toBe(first);
    expect(second.snippets.some((s) => s.heading === "Y")).toBe(false);
  });
});
