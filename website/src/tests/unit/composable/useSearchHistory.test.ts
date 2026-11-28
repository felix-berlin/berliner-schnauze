import { HISTORY_MAX, useSearchHistory } from "@composables/useSearchHistory";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "schnellsuche-verlauf";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("useSearchHistory", () => {
  it("saves trimmed terms newest first, dedupes case-insensitively, shows 3", () => {
    const h = useSearchHistory();
    for (const t of ["quark", " Zappel ", "", "  ", "knust", "QUARK", "teig"]) h.save(t);
    expect(h.recent.value).toEqual(["teig", "QUARK", "knust"]);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(["teig", "QUARK", "knust", "Zappel"]);
    expect(useSearchHistory().recent.value).toEqual(["teig", "QUARK", "knust"]);
  });

  it("keeps at most HISTORY_MAX entries", () => {
    const h = useSearchHistory();
    for (let i = 0; i < HISTORY_MAX + 5; i++) h.save(`wort${i}`);
    const stored = JSON.parse(localStorage.getItem(KEY)!);
    expect(stored).toHaveLength(HISTORY_MAX);
    expect(stored[0]).toBe(`wort${HISTORY_MAX + 4}`);
  });

  it("removes one entry and clears all", () => {
    const h = useSearchHistory();
    h.save("quark");
    h.save("knust");
    h.remove("QUARK");
    expect(h.recent.value).toEqual(["knust"]);
    h.clear();
    expect(h.recent.value).toEqual([]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("ignores junk in storage", () => {
    localStorage.setItem(KEY, '{"no":"list"}');
    expect(useSearchHistory().recent.value).toEqual([]);
    localStorage.setItem(KEY, '["quark", 3, null]');
    expect(useSearchHistory().recent.value).toEqual(["quark"]);
  });

  it("works in memory when storage throws (private mode)", () => {
    const fail = () => {
      throw new DOMException("denied", "SecurityError");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(fail);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(fail);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(fail);
    const h = useSearchHistory();
    expect(h.recent.value).toEqual([]);
    h.save("quark");
    expect(h.recent.value).toEqual(["quark"]);
    expect(() => h.remove("quark")).not.toThrow();
    expect(() => h.clear()).not.toThrow();
  });
});
