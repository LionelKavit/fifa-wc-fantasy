// Live Scout smoke test — requires a real ANTHROPIC_API_KEY and network. Skipped
// otherwise (the default in this environment). Asserts a grounded, non-empty
// answer from the real model + tool loop.
import { describe, it, expect } from "vitest";
import { askScout } from "./scout";

const live = process.env.ANTHROPIC_API_KEY ? describe : describe.skip;

live("Scout (live)", () => {
  it("answers what Mexico needs, grounded via tools", async () => {
    const ans = await askScout("What does Mexico need to advance?", { trials: 5000, seed: 1 });
    expect(ans.source).toBe("llm");
    expect(ans.text.length).toBeGreaterThan(0);
  }, 60_000);
});
