import {
  useTestStorageEngine,
  setTestStorageKey,
  cleanTestStorage,
  getTestStorage,
} from "@nanostores/persistent";
import { $wordOfTheDay, getWordOfTheDay } from "@stores/index.ts";
import { JSDOM } from "jsdom";
import { cleanStores, keepMount, allTasks } from "nanostores";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

describe("Word of the Day", () => {
  beforeAll(() => {
    useTestStorageEngine();
  });

  afterEach(() => {
    cleanTestStorage();
    setTestStorageKey("wordOfTheDay:word", "{}");
    setTestStorageKey("wordOfTheDay:loading", "true");
    setTestStorageKey("wordOfTheDay:error", "false");
    setTestStorageKey("wordOfTheDay:timestamp", "0");
    vi.restoreAllMocks();
  });

  it("$wordOfTheDay should have initial state", () => {
    expect($wordOfTheDay.get()).toEqual({
      word: {},
      loading: true,
      error: false,
      timestamp: 0,
    });
  });

  it("$wordOfTheDay should handle error state", () => {
    setTestStorageKey("wordOfTheDay:error", "true");

    expect($wordOfTheDay.get().error).toBe(true);
  });
});

describe("getWordOfTheDay", () => {
  beforeAll(() => {
    useTestStorageEngine();
  });

  afterEach(() => {
    cleanTestStorage();
    setTestStorageKey("wordOfTheDay:word", "{}");
    setTestStorageKey("wordOfTheDay:loading", "true");
    setTestStorageKey("wordOfTheDay:error", "false");
    setTestStorageKey("wordOfTheDay:timestamp", "0");
    vi.restoreAllMocks();
  });

  it("populates word data and clears loading on success", async () => {
    const wordData = { ID: 1, berlinerisch: "Jotte", translations: [{ translation: "Oh Gott" }] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(wordData),
      }),
    );

    await getWordOfTheDay();

    expect($wordOfTheDay.get().word).toEqual(wordData);
    expect($wordOfTheDay.get().loading).toBe(false);
    expect($wordOfTheDay.get().error).toBe(false);
    expect($wordOfTheDay.get().timestamp).toBeGreaterThan(0);
  });

  it("sets error and clears loading when response is not ok", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue("Not Found"),
      }),
    );

    await getWordOfTheDay();

    expect($wordOfTheDay.get().error).toBe(true);
    expect($wordOfTheDay.get().loading).toBe(false);
  });

  it("sets error and clears loading on network failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));

    await getWordOfTheDay();

    expect($wordOfTheDay.get().error).toBe(true);
    expect($wordOfTheDay.get().loading).toBe(false);
  });

  it("records a timestamp on successful fetch", async () => {
    const before = Date.now();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ ID: 2, berlinerisch: "Ick" }),
      }),
    );

    await getWordOfTheDay();

    const ts = $wordOfTheDay.get().timestamp;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(Date.now());
  });
});
