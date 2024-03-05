import { describe, it, expect } from "vitest";
import { similarWords } from "@utils/wordHelper";

import * as natural from "natural";

describe("similarWords", () => {
  const mockWords = [
    { id: "1", wordProperties: { berlinerisch: "word1" } },
    { id: "2", wordProperties: { berlinerisch: "word2" } },
    { id: "3", wordProperties: { berlinerisch: "word3" } },
  ];

  it("returns empty array if no current word or all words are provided", () => {
    expect(similarWords(null, mockWords[0])).toEqual([]);
    expect(similarWords(mockWords, null)).toEqual([]);
  });

  it("returns all words without current word", () => {
    const result = similarWords(mockWords, mockWords[0]);
    expect(result.length).toBe(2);
    expect(result.some((word) => word.word.id === "1")).toBe(false);
  });

  it("returns words with similarity score", () => {
    const result = similarWords(mockWords, mockWords[0]);
    expect(result[0].isSimilar).toBe(
      natural.JaroWinklerDistance(
        mockWords[1].wordProperties.berlinerisch,
        mockWords[0].wordProperties.berlinerisch,
        false,
      ),
    );
  });

  it("filters words based on similarity if needsSimilarity is provided", () => {
    const result = similarWords(mockWords, mockWords[0], 0.8);
    expect(result.every((word) => word.isSimilar >= 0.8)).toBe(true);
  });
});
