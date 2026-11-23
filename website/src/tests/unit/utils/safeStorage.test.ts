// @vitest-environment jsdom
import { safeGet, safeGetJson, safeSet } from "@utils/safeStorage.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("safeStorage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("reads, writes and removes", () => {
    expect(safeGet("k")).toBeNull();
    safeSet("k", "v");
    expect(safeGet("k")).toBe("v");
    safeSet("k", null);
    expect(safeGet("k")).toBeNull();
  });
  it("parses JSON and yields undefined for missing or malformed values", () => {
    expect(safeGetJson("k")).toBeUndefined();
    safeSet("k", "{nope");
    expect(safeGetJson("k")).toBeUndefined();
    safeSet("k", '{"a":1}');
    expect(safeGetJson("k")).toEqual({ a: 1 });
  });
  it("stays silent when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(safeGet("k")).toBeNull();
    expect(safeGetJson("k")).toBeUndefined();
    expect(() => safeSet("k", "v")).not.toThrow();
  });
});
