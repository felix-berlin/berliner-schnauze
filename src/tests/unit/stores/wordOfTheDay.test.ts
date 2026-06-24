import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({
  WP_REST_API: "https://mock-api.example.com",
}));

vi.mock("@nanostores/persistent", () => ({
  persistentMap: vi.fn((key: string, initial: unknown) => {
    const { map } = require("nanostores");
    return map(initial);
  }),
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("wordOfTheDay store", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ berlinerisch: "Schnauze", ID: 1 }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe("getWordOfTheDay", () => {
    it("sets word and loading=false on success", async () => {
      const { $wordOfTheDay, getWordOfTheDay } = await import("@stores/wordOfTheDay.ts");
      await getWordOfTheDay();
      expect($wordOfTheDay.get().loading).toBe(false);
      expect($wordOfTheDay.get().error).toBe(false);
      expect($wordOfTheDay.get().word).toEqual({ berlinerisch: "Schnauze", ID: 1 });
    });

    it("sets timestamp on success", async () => {
      const before = Date.now();
      const { $wordOfTheDay, getWordOfTheDay } = await import("@stores/wordOfTheDay.ts");
      await getWordOfTheDay();
      expect($wordOfTheDay.get().timestamp).toBeGreaterThanOrEqual(before);
    });

    it("sets error=true and loading=false on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      const { $wordOfTheDay, getWordOfTheDay } = await import("@stores/wordOfTheDay.ts");
      await getWordOfTheDay();
      expect($wordOfTheDay.get().error).toBe(true);
      expect($wordOfTheDay.get().loading).toBe(false);
    });

    it("handles fetch network error gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("network error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { $wordOfTheDay, getWordOfTheDay } = await import("@stores/wordOfTheDay.ts");
      await getWordOfTheDay();
      expect($wordOfTheDay.get().error).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe("onMount / isCachedToday", () => {
    it("calls getWordOfTheDay when no timestamp in localStorage", async () => {
      const { $wordOfTheDay } = await import("@stores/wordOfTheDay.ts");
      const unsub = $wordOfTheDay.subscribe(() => {});
      await new Promise<void>((r) => setTimeout(r, 50));
      expect(mockFetch).toHaveBeenCalled();
      unsub();
    });

    it("skips fetch when localStorage timestamp is from today (isCachedToday = true)", async () => {
      localStorage.setItem("wordOfTheDay:timestamp", JSON.stringify(Date.now()));
      const { $wordOfTheDay } = await import("@stores/wordOfTheDay.ts");
      mockFetch.mockClear();
      const unsub = $wordOfTheDay.subscribe(() => {});
      await new Promise<void>((r) => setTimeout(r, 50));
      expect(mockFetch).not.toHaveBeenCalled();
      unsub();
    });

    it("fetches when localStorage timestamp is from a past day (isCachedToday = false)", async () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      localStorage.setItem("wordOfTheDay:timestamp", JSON.stringify(yesterday));
      const { $wordOfTheDay } = await import("@stores/wordOfTheDay.ts");
      mockFetch.mockClear();
      const unsub = $wordOfTheDay.subscribe(() => {});
      await new Promise<void>((r) => setTimeout(r, 50));
      expect(mockFetch).toHaveBeenCalled();
      unsub();
    });

    it("returns 0 from getPersistedTimestamp when localStorage.getItem throws", async () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("storage error");
      });
      const { $wordOfTheDay } = await import("@stores/wordOfTheDay.ts");
      mockFetch.mockClear();
      const unsub = $wordOfTheDay.subscribe(() => {});
      await new Promise<void>((r) => setTimeout(r, 50));
      // timestamp=0 → isCachedToday(0) is false → fetch is called
      expect(mockFetch).toHaveBeenCalled();
      unsub();
    });
  });
});
