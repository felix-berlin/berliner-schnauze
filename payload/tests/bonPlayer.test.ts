import { describe, expect, it } from "vitest";

import { generateCode, normalizeCode } from "../src/lib/bonPlayer";

describe("generateCode", () => {
  it("has the format XXXX-XXXX-XXXX from the alphabet", () => {
    expect(generateCode()).toMatch(/^[A-HJKMNP-Z2-9]{4}(-[A-HJKMNP-Z2-9]{4}){2}$/);
  });

  it("does not repeat", () => {
    const codes = new Set(Array.from({ length: 200 }, generateCode));
    expect(codes.size).toBe(200);
  });
});

describe("normalizeCode", () => {
  it("canonicalises case, spaces and dashes", () => {
    expect(normalizeCode("k7qd m2x9 zt4b")).toBe("K7QD-M2X9-ZT4B");
    expect(normalizeCode(" K7QD-M2X9-ZT4B ")).toBe("K7QD-M2X9-ZT4B");
  });

  it("rejects malformed input", () => {
    for (const bad of ["", "K7QD-M2X9", "K7QD-M2X9-ZT4B-AAAA", "K7QD-M2X9-ZT4O", "A".repeat(10_000)]) {
      expect(normalizeCode(bad)).toBeUndefined();
    }
  });
});
