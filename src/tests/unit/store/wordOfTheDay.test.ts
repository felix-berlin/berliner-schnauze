import { describe, it, expect, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { cleanStores, keepMount, allTasks } from "nanostores";
import { wordOfTheDay, getWordOfTheDay } from "@stores/index"; // replace with your actual file path

describe("Word of the Day", () => {
  afterEach(() => {
    cleanStores(wordOfTheDay);
    wordOfTheDay.set({ word: {}, loading: true, error: false });
  });

  it("wordOfTheDay should have initial state", () => {
    expect(wordOfTheDay.get()).toEqual({
      word: {},
      loading: true,
      error: false,
    });
  });

  it("wordOfTheDay should handle error state", () => {
    const wordOfTheDayData = { word: {}, loading: false, error: true };
    keepMount(wordOfTheDay);
    wordOfTheDay.set(wordOfTheDayData);

    expect(wordOfTheDay.get().error).toBe(true);
  });
});
