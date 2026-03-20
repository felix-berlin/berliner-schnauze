import WordSearch from "@components/word-search/WordSearch.astro";
import { describe, expect, it } from "vitest";

describe("WordSearch.astro", () => {
  it("loads component module", () => {
    expect(WordSearch).toBeDefined();
  });
});
