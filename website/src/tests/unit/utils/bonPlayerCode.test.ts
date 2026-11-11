import { normalizeCode } from "@utils/bonPlayerCode.ts";
import { describe, expect, it } from "vitest";

describe("normalizeCode", () => {
  it("accepts any case, whitespace, dashes and underscores", () => {
    expect(normalizeCode(" k7qd m2x9_zt4b ")).toBe("K7QD-M2X9-ZT4B");
    expect(normalizeCode("K7QDM2X9ZT4B")).toBe("K7QD-M2X9-ZT4B");
  });

  it("rejects wrong length and characters outside the alphabet", () => {
    expect(normalizeCode("K7QD-M2X9")).toBeUndefined();
    expect(normalizeCode("K7QD-M2X9-ZT4B-A")).toBeUndefined();
    expect(normalizeCode("K7QD-M2X9-ZT40")).toBeUndefined(); // 0 is left out
  });
});
