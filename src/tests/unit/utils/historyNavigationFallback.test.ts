import { shouldForceReload } from "@utils/historyNavigationFallback";
import { describe, expect, it } from "vitest";

describe("shouldForceReload", () => {
  it("returns true for null state", () => {
    expect(shouldForceReload(null)).toBe(true);
  });

  it("returns true for undefined state", () => {
    expect(shouldForceReload(undefined)).toBe(true);
  });

  it("returns true for a non-object state", () => {
    expect(shouldForceReload("some-string")).toBe(true);
    expect(shouldForceReload(42)).toBe(true);
  });

  it("returns true for an object missing an index property", () => {
    expect(shouldForceReload({ scrollX: 0, scrollY: 0 })).toBe(true);
  });

  it("returns true when index is not a number", () => {
    expect(shouldForceReload({ index: "1", scrollX: 0, scrollY: 0 })).toBe(true);
  });

  it("returns false for a valid Astro-tracked state", () => {
    expect(shouldForceReload({ index: 1, scrollX: 0, scrollY: 0 })).toBe(false);
  });

  it("returns false when index is 0 (must not be treated as falsy-invalid)", () => {
    expect(shouldForceReload({ index: 0, scrollX: 0, scrollY: 0 })).toBe(false);
  });
});
