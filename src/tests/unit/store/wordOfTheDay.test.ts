import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { JSDOM } from "jsdom";
import { cleanStores, keepMount, allTasks } from "nanostores";
import { $wordOfTheDay, getWordOfTheDay } from "@stores/index.ts";
import {
  useTestStorageEngine,
  setTestStorageKey,
  cleanTestStorage,
  getTestStorage,
} from "@nanostores/persistent";

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
