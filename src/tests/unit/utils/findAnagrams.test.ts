import { findAnagrams } from "@utils/wordHelper";
import { describe, it, expect } from "vitest";
import type { BerlinerWord } from "@/gql/entity-types";

const makeWord = (berlinerisch: string, id: string): BerlinerWord =>
  ({
    id,
    slug: berlinerisch.toLowerCase(),
    wordProperties: { berlinerisch },
  }) as unknown as BerlinerWord;

describe("findAnagrams", () => {
  it("finds an anagram in the word list", () => {
    const allWords = [makeWord("Bier", "1"), makeWord("Reib", "2"), makeWord("Pinsel", "3")];
    const result = findAnagrams("Bier", allWords);
    expect(result).toHaveLength(1);
    expect(result[0]?.wordProperties?.berlinerisch).toBe("Reib");
  });

  it("excludes the word itself from results", () => {
    const allWords = [makeWord("Bier", "1"), makeWord("Bier", "2")];
    const result = findAnagrams("Bier", allWords);
    expect(result).toHaveLength(0);
  });

  it("returns empty array when no anagrams found", () => {
    const allWords = [makeWord("Pinsel", "1"), makeWord("Schnauze", "2")];
    const result = findAnagrams("Bier", allWords);
    expect(result).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const allWords = [makeWord("REIB", "1")];
    const result = findAnagrams("bier", allWords);
    expect(result).toHaveLength(1);
  });

  it("does not match words with extra letters", () => {
    const allWords = [makeWord("Biere", "1")];
    const result = findAnagrams("Bier", allWords);
    expect(result).toHaveLength(0);
  });
});
