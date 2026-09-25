import { similarWords } from "@utils/wordHelper";
import * as natural from "natural";
import { describe, it, expect } from "vitest";

describe("similarWords", () => {
  const mockWords = [
    { id: "1", wordProperties: { berlinerisch: "word1" } },
    { id: "2", wordProperties: { berlinerisch: "word2" } },
    { id: "3", wordProperties: { berlinerisch: "word3" } },
  ];

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

  it("length pre-filter never drops a word that reaches the threshold", () => {
    const texts = [
      "wa",
      "was",
      "wat",
      "waschen",
      "wachtmeister",
      "a",
      "ab",
      "abc",
      "abcd",
      "abcdefgh",
    ];
    const words = texts.map((t, i) => ({ id: String(i), wordProperties: { berlinerisch: t } }));
    for (const threshold of [0.81, 0.85, 0.9, 0.95]) {
      for (const current of words) {
        const expected = words
          .filter((w) => w.id !== current.id)
          .filter(
            (w) =>
              natural.JaroWinklerDistance(
                w.wordProperties.berlinerisch,
                current.wordProperties.berlinerisch,
              ) >= threshold,
          );
        expect(similarWords(words, current, threshold).map((r) => r.word)).toEqual(expected);
      }
    }
  });
});
