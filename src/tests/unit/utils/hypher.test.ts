import { describe, expect, it, vi } from "vitest";

vi.mock("hyphenation.de", () => ({ default: {} }));

vi.mock("hypher", () => ({
  default: vi.fn().mockImplementation(function () {
    this.hyphenate = vi.fn(() => ["Ber", "li", "ner"]);
  }),
}));

describe("hypher", () => {
  it("exports hypher as a defined value", async () => {
    const { hypher } = await import("@utils/hypher.ts");
    expect(hypher).toBeDefined();
  });

  it("hypher.hyphenate returns an array", async () => {
    const { hypher } = await import("@utils/hypher.ts");
    const result = hypher.hyphenate("Berliner");
    expect(Array.isArray(result)).toBe(true);
  });

  it("hypher.hyphenate returns the mocked syllable array", async () => {
    const { hypher } = await import("@utils/hypher.ts");
    const result = hypher.hyphenate("Berliner");
    expect(result).toEqual(["Ber", "li", "ner"]);
  });
});
