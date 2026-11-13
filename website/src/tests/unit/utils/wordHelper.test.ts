import type { WordRef } from "@utils/wordHelper.ts";

import {
  alphabeticNeighbors,
  capitalizeFirstLetter,
  countLetters,
  findAnagrams,
  similarSoundingWords,
  similarWords,
  translateNlpTags,
} from "@utils/wordHelper";
import { describe, expect, it } from "vitest";

function makeWord(id: number | string, berlinerisch: string | null = "test"): WordRef {
  return { berlinerisch, id } as unknown as WordRef;
}

// ---------------------------------------------------------------------------

describe("countLetters", () => {
  it("returns zeros for empty string", () => {
    expect(countLetters("")).toEqual({ consonants: 0, vowels: 0 });
  });

  it("counts vowels and consonants correctly", () => {
    expect(countLetters("abc")).toEqual({ consonants: 2, vowels: 1 });
  });

  it("counts umlauts as vowels", () => {
    expect(countLetters("äöü")).toEqual({ consonants: 0, vowels: 3 });
  });

  it("counts ß as consonant", () => {
    expect(countLetters("ß")).toEqual({ consonants: 1, vowels: 0 });
  });

  it("ignores digits and spaces", () => {
    expect(countLetters("a 1")).toEqual({ consonants: 0, vowels: 1 });
  });
});

// ---------------------------------------------------------------------------

describe("translateNlpTags", () => {
  it("returns empty array for empty input", () => {
    expect(translateNlpTags([])).toEqual([]);
  });

  it("translates known tags to German", () => {
    const result = translateNlpTags([{ Bierpinsel: ["Noun", "Singular"] }]);
    expect(result[0]["Bierpinsel"]).toContain("Nomen");
    expect(result[0]["Bierpinsel"]).toContain("Einzahl");
  });

  it("passes unknown tags through as-is rather than returning undefined", () => {
    const result = translateNlpTags([{ Bierpinsel: ["UnknownTag"] }]);
    expect(result[0]["Bierpinsel"]).toContain("UnknownTag");
  });

  it("handles multiple words", () => {
    const result = translateNlpTags([{ Bierpinsel: ["Noun"] }, { Maler: ["Verb"] }]);
    expect(result).toHaveLength(2);
    expect(result[1]["Maler"]).toContain("Verb");
  });
});

// ---------------------------------------------------------------------------

describe("similarWords", () => {
  it("excludes current word from results", () => {
    const current = makeWord("1", "Bier");
    const other = makeWord("2", "Pier");
    const results = similarWords([current, other], current);
    expect(results.every((r) => r.word.id !== "1")).toBe(true);
    expect(results).toHaveLength(1);
  });

  it("returns all remaining words when needsSimilarity is undefined", () => {
    const current = makeWord("1", "Bier");
    const others = [makeWord("2", "Pier"), makeWord("3", "Xylophon")];
    expect(similarWords([current, ...others], current)).toHaveLength(2);
  });

  it("filters by threshold when needsSimilarity is provided", () => {
    const current = makeWord("1", "Bier");
    const close = makeWord("2", "Biere"); // high JW similarity
    const far = makeWord("3", "Xylophon"); // low similarity
    const results = similarWords([current, close, far], current, 0.8);
    expect(results.some((r) => r.word.id === "2")).toBe(true);
    expect(results.some((r) => r.word.id === "3")).toBe(false);
  });

  it("needsSimilarity:0 applies the filter (not treated as undefined)", () => {
    const current = makeWord("1", "Bier");
    const other = makeWord("2", "Pier");
    // threshold 0 → all words with isSimilar >= 0 pass (JW always >= 0)
    const withZero = similarWords([current, other], current, 0);
    const withUndefined = similarWords([current, other], current, undefined);
    expect(withZero).toHaveLength(withUndefined.length);
  });
});

// ---------------------------------------------------------------------------

describe("similarSoundingWords", () => {
  it("excludes current word from results", () => {
    const current = makeWord("1", "Bier");
    const other = makeWord("2", "Pier");
    const results = similarSoundingWords([current, other], current);
    expect(results.every((r) => r.id !== "1")).toBe(true);
  });

  it("returns phonetically similar words", () => {
    const current = makeWord("1", "Smith");
    const similar = makeWord("2", "Smyth");
    const results = similarSoundingWords([current, similar], current);
    expect(results.map((r) => r.id)).toEqual(["2"]);
  });

  it("returns no matches when berlinerisch is missing", () => {
    const current = makeWord("1", null);
    const other = makeWord("2", "Pier");
    expect(similarSoundingWords([current, other], current)).toEqual([]);
  });
});

describe("capitalizeFirstLetter", () => {
  it("capitalizes the first letter of a lowercase word", () => {
    expect(capitalizeFirstLetter("berliner")).toBe("Berliner");
  });

  it("leaves already-capitalized words unchanged", () => {
    expect(capitalizeFirstLetter("Schnauze")).toBe("Schnauze");
  });

  it("handles single character", () => {
    expect(capitalizeFirstLetter("a")).toBe("A");
  });

  it("handles empty string", () => {
    expect(capitalizeFirstLetter("")).toBe("");
  });
});

// ---------------------------------------------------------------------------

describe("findAnagrams", () => {
  function makeRef(id: string, berlinerisch: string | null | undefined) {
    return { berlinerisch, id };
  }

  it("returns words whose letters match the target", () => {
    const words = [makeRef("1", "arte"), makeRef("2", "rate"), makeRef("3", "nope")];
    const result = findAnagrams("tare", words);
    expect(result.map((w) => w.id)).toEqual(["1", "2"]);
  });

  it("excludes the word itself (case-insensitive)", () => {
    const words = [makeRef("1", "Tare"), makeRef("2", "rate")];
    const result = findAnagrams("tare", words);
    expect(result.map((w) => w.id)).toEqual(["2"]);
  });

  it("returns empty array when no anagrams exist", () => {
    const words = [makeRef("1", "hello"), makeRef("2", "world")];
    expect(findAnagrams("xyz", words)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe("alphabeticNeighbors", () => {
  function makeRef(id: string, berlinerisch: string | null | undefined) {
    return { berlinerisch, id };
  }

  const words = [
    makeRef("1", "Apfel"),
    makeRef("2", "Birne"),
    makeRef("3", "Daten"),
    makeRef("4", "Eier"),
    makeRef("5", "Feige"),
  ];

  it("returns correct before and after neighbors", () => {
    const result = alphabeticNeighbors(words, makeRef("3", "Daten"), 2);
    expect(result.before.map((w) => w.id)).toEqual(["2", "1"]);
    expect(result.after.map((w) => w.id)).toEqual(["4", "5"]);
  });

  it("returns empty arrays when currentWord id is not in allWords", () => {
    const result = alphabeticNeighbors(words, makeRef("99", "Nope"), 2);
    expect(result).toEqual({ after: [], before: [] });
  });

  it("limits neighbors to n", () => {
    const result = alphabeticNeighbors(words, makeRef("3", "Daten"), 1);
    expect(result.before).toHaveLength(1);
    expect(result.after).toHaveLength(1);
  });

  it("handles word at start — no before neighbors", () => {
    const result = alphabeticNeighbors(words, makeRef("1", "Apfel"), 3);
    expect(result.before).toEqual([]);
    expect(result.after.map((w) => w.id)).toEqual(["2", "3", "4"]);
  });

  it("handles word at end — no after neighbors", () => {
    const result = alphabeticNeighbors(words, makeRef("5", "Feige"), 3);
    expect(result.after).toEqual([]);
    expect(result.before.map((w) => w.id)).toEqual(["4", "3", "2"]);
  });
});
