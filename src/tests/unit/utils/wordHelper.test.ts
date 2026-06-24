import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  alphabeticNeighbors,
  capitalizeFirstLetter,
  coloredConsonantsAndVowels,
  countLetters,
  createWikimediaFileList,
  findAnagrams,
  similarSoundingWords,
  similarWords,
  translateNlpTags,
} from "@utils/wordHelper";
import type { BerlinerWord } from "@/gql/entity-types";

vi.mock("@services/wikimediaApi.ts", () => ({
  fetchWikimediaAPI: vi.fn(),
}));

import { fetchWikimediaAPI } from "@services/wikimediaApi.ts";
const mockFetch = vi.mocked(fetchWikimediaAPI);

function makeWord(id: string, berlinerisch: string | null = "test"): BerlinerWord {
  return { id, wordProperties: { berlinerisch } } as unknown as BerlinerWord;
}

// ---------------------------------------------------------------------------

describe("coloredConsonantsAndVowels", () => {
  it("returns empty string for empty input", () => {
    expect(coloredConsonantsAndVowels("")).toBe("");
  });

  it("wraps vowel in is-vowel span", () => {
    expect(coloredConsonantsAndVowels("a")).toBe('<span class="is-vowel">a</span>');
  });

  it("wraps consonant in is-consonant span", () => {
    expect(coloredConsonantsAndVowels("b")).toBe('<span class="is-consonant">b</span>');
  });

  it("treats uppercase vowel as vowel", () => {
    const result = coloredConsonantsAndVowels("A");
    expect(result).toContain('class="is-vowel"');
    expect(result).toContain(">A<");
  });

  it("treats umlauts as vowels", () => {
    expect(coloredConsonantsAndVowels("ö")).toContain('class="is-vowel"');
    expect(coloredConsonantsAndVowels("ä")).toContain('class="is-vowel"');
    expect(coloredConsonantsAndVowels("ü")).toContain('class="is-vowel"');
  });

  it("produces correct span sequence for a two-letter word", () => {
    expect(coloredConsonantsAndVowels("ab")).toBe(
      '<span class="is-vowel">a</span><span class="is-consonant">b</span>',
    );
  });
});

// ---------------------------------------------------------------------------

describe("countLetters", () => {
  it("returns zeros for empty string", () => {
    expect(countLetters("")).toEqual({ vowels: 0, consonants: 0 });
  });

  it("counts vowels and consonants correctly", () => {
    expect(countLetters("abc")).toEqual({ vowels: 1, consonants: 2 });
  });

  it("counts umlauts as vowels", () => {
    expect(countLetters("äöü")).toEqual({ vowels: 3, consonants: 0 });
  });

  it("counts ß as consonant", () => {
    expect(countLetters("ß")).toEqual({ vowels: 0, consonants: 1 });
  });

  it("ignores digits and spaces", () => {
    expect(countLetters("a 1")).toEqual({ vowels: 1, consonants: 0 });
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
  it("returns empty array when allWords is falsy", () => {
    expect(similarWords(null as unknown as BerlinerWord[], makeWord("1"))).toEqual([]);
  });

  it("returns empty array when currentWord is falsy", () => {
    expect(similarWords([makeWord("1")], null as unknown as BerlinerWord)).toEqual([]);
  });

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
  it("returns empty array when allWords is falsy", () => {
    expect(similarSoundingWords(null as unknown as BerlinerWord[], makeWord("1"))).toEqual([]);
  });

  it("returns empty array when currentWord is falsy", () => {
    expect(similarSoundingWords([makeWord("1")], null as unknown as BerlinerWord)).toEqual([]);
  });

  it("excludes current word from results", () => {
    const current = makeWord("1", "Bier");
    const other = makeWord("2", "Pier");
    const results = similarSoundingWords([current, other], current);
    expect(results.every((r) => r.word.id !== "1")).toBe(true);
  });

  it("marks phonetically similar words as isSimilar true", () => {
    const current = makeWord("1", "Smith");
    const similar = makeWord("2", "Smyth");
    const results = similarSoundingWords([current, similar], current);
    expect(results.find((r) => r.word.id === "2")?.isSimilar).toBe(true);
  });

  it("returns isSimilar false when berlinerisch is missing", () => {
    const current = makeWord("1", null);
    const other = makeWord("2", "Pier");
    const results = similarSoundingWords([current, other], current);
    expect(results.find((r) => r.word.id === "2")?.isSimilar).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe("createWikimediaFileList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array for null input", async () => {
    expect(await createWikimediaFileList(null)).toEqual([]);
  });

  it("returns empty array for empty array", async () => {
    expect(await createWikimediaFileList([])).toEqual([]);
  });

  it("returns mapped list on success", async () => {
    mockFetch.mockResolvedValue({ thumbnail: { url: "http://example.com/img.jpg" } });

    const result = await createWikimediaFileList([
      { wikimediaFile: "File:test.jpg", caption: "cap", description: "desc" } as never,
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].caption).toBe("cap");
    expect(result[0].description).toBe("desc");
  });

  it("skips failed files and logs error without aborting", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch
      .mockResolvedValueOnce({ thumbnail: { url: "http://example.com/img1.jpg" } })
      .mockRejectedValueOnce(new Error("network error"));

    const result = await createWikimediaFileList([
      { wikimediaFile: "File:ok.jpg", caption: "ok", description: "" } as never,
      { wikimediaFile: "File:bad.jpg", caption: "bad", description: "" } as never,
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].caption).toBe("ok");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[wordHelper] createWikimediaFileList: failed to fetch",
      1,
      "file(s):",
      expect.any(Array),
    );
    consoleSpy.mockRestore();
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
    return { id, wordProperties: berlinerisch !== undefined ? { berlinerisch } : undefined };
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

  it("handles word with null berlinerisch (falls back to empty string)", () => {
    const words = [makeRef("1", null), makeRef("2", "abc")];
    const result = findAnagrams("abc", words);
    expect(result.map((w) => w.id)).toEqual([]);
  });

  it("handles word with undefined wordProperties (falls back to empty string)", () => {
    const words = [makeRef("1", undefined), makeRef("2", "test")];
    const result = findAnagrams("sett", words);
    expect(result.map((w) => w.id)).toEqual(["2"]);
  });
});

// ---------------------------------------------------------------------------

describe("alphabeticNeighbors", () => {
  function makeRef(id: string, berlinerisch: string | null | undefined) {
    return { id, wordProperties: berlinerisch !== undefined ? { berlinerisch } : undefined };
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
    expect(result).toEqual({ before: [], after: [] });
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

  it("sorts words with null berlinerisch as empty string (branch coverage)", () => {
    const mixed = [makeRef("a", null), makeRef("b", "Zoo"), makeRef("c", undefined)];
    const result = alphabeticNeighbors(mixed, makeRef("b", "Zoo"), 3);
    expect(result.before).toHaveLength(2);
    expect(result.after).toEqual([]);
  });
});
