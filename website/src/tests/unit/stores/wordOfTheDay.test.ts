import { map } from "nanostores";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nanostores/persistent", () => ({
  persistentMap: vi.fn((key: string, initial: unknown) => map(initial)),
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Imported after `vi.resetModules()` so it shares the store's nanostores instance.
const flushTasks = async () => (await import("nanostores")).allTasks();

describe("wordOfTheDay store", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ berlinerisch: "Schnauze", slug: "schnauze" }),
      ok: true,
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
      expect($wordOfTheDay.get().word).toEqual({ berlinerisch: "Schnauze", slug: "schnauze" });
    });

    it("sets timestamp on success", async () => {
      const before = Date.now();
      const { $wordOfTheDay, getWordOfTheDay } = await import("@stores/wordOfTheDay.ts");
      await getWordOfTheDay();
      expect($wordOfTheDay.get().timestamp).toBeGreaterThanOrEqual(before);
    });

    it("sets error=true and loading=false on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      vi.spyOn(console, "error").mockImplementation(() => {});
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
    it("asks the site's own word-of-the-day endpoint", async () => {
      const { getWordOfTheDay } = await import("@stores/wordOfTheDay.ts");
      mockFetch.mockClear();
      await getWordOfTheDay();
      expect(mockFetch).toHaveBeenCalledWith("/api/word-of-the-day");
    });

    it("calls getWordOfTheDay when no timestamp in localStorage", async () => {
      const { $wordOfTheDay } = await import("@stores/wordOfTheDay.ts");
      const unsub = $wordOfTheDay.subscribe(() => {});
      await flushTasks();
      expect(mockFetch).toHaveBeenCalled();
      unsub();
    });

    it("fetches again when today's cached word has the former WordPress shape (no slug)", async () => {
      localStorage.setItem("wordOfTheDay:timestamp", JSON.stringify(Date.now()));
      localStorage.setItem("wordOfTheDay:word", JSON.stringify({ ID: 1, post_name: "schnauze" }));
      const { $wordOfTheDay } = await import("@stores/wordOfTheDay.ts");
      mockFetch.mockClear();
      const unsub = $wordOfTheDay.subscribe(() => {});
      await flushTasks();
      expect(mockFetch).toHaveBeenCalled();
      unsub();
    });

    it("skips fetch when localStorage timestamp is from today (isCachedToday = true)", async () => {
      localStorage.setItem("wordOfTheDay:timestamp", JSON.stringify(Date.now()));
      localStorage.setItem("wordOfTheDay:word", JSON.stringify({ berlinerisch: "Schnauze", slug: "schnauze" }));
      const { $wordOfTheDay } = await import("@stores/wordOfTheDay.ts");
      mockFetch.mockClear();
      const unsub = $wordOfTheDay.subscribe(() => {});
      await flushTasks();
      expect(mockFetch).not.toHaveBeenCalled();
      unsub();
    });

    it("fetches when localStorage timestamp is from a past day (isCachedToday = false)", async () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      localStorage.setItem("wordOfTheDay:timestamp", JSON.stringify(yesterday));
      const { $wordOfTheDay } = await import("@stores/wordOfTheDay.ts");
      mockFetch.mockClear();
      const unsub = $wordOfTheDay.subscribe(() => {});
      await flushTasks();
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
      await flushTasks();
      // timestamp=0 → isCachedToday(0) is false → fetch is called
      expect(mockFetch).toHaveBeenCalled();
      unsub();
    });
  });
});
