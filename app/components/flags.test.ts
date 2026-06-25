import { describe, it, expect } from "vitest";
import { flagFor } from "./flags";

describe("flagFor", () => {
  it("maps FIFA codes to the right country flags", () => {
    expect(flagFor("MEX")).toBe("🇲🇽");
    expect(flagFor("RSA")).toBe("🇿🇦"); // South Africa, not RS
    expect(flagFor("KOR")).toBe("🇰🇷");
    expect(flagFor("NED")).toBe("🇳🇱");
    expect(flagFor("USA")).toBe("🇺🇸");
    expect(flagFor("GER")).toBe("🇩🇪");
  });

  it("handles England/Scotland subdivision flags", () => {
    expect(flagFor("ENG")).toBe("🏴󠁧󠁢󠁥󠁮󠁧󠁿");
    expect(flagFor("SCO")).toBe("🏴󠁧󠁢󠁳󠁣󠁴󠁿");
  });

  it("is case-insensitive and falls back gracefully", () => {
    expect(flagFor("mex")).toBe("🇲🇽");
    expect(flagFor("ZZZ")).toBe("🏳️");
  });
});
