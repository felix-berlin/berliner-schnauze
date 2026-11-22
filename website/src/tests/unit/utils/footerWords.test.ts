import {
  createWordCycle,
  pickFooterWords,
  toFooterWord,
  type FooterSourceWord,
} from "@utils/footerWords.ts";
import { describe, expect, it } from "vitest";

const word = (slug: string, over: Partial<FooterSourceWord> = {}): FooterSourceWord => ({
  article: null,
  berlinerisch: `Lemma ${slug}`,
  examples: [{ example: `Beispiel ${slug}` }],
  slug,
  translations: [{ translation: `Bedeutung ${slug}` }],
  wordTypes: [],
  ...over,
});

/** Deterministic random source (mulberry32). */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pool = (n: number) => Array.from({ length: n }, (_, i) => word(`w${i}`));

describe("toFooterWord", () => {
  it("maps lemma, first meaning and first example", () => {
    expect(
      toFooterWord(
        word("a", {
          article: "der",
          examples: [{ example: "" }, { example: "Erster Satz" }],
          translations: [{ translation: " " }, { translation: "Erste Bedeutung" }],
        }),
      ),
    ).toEqual({
      example: "Erster Satz",
      kind: "der",
      lemma: "Lemma a",
      meaning: "Erste Bedeutung",
      slug: "a",
    });
  });

  it("falls back to the word type when there is no article, and to null without both", () => {
    expect(toFooterWord(word("a", { wordTypes: [{ id: 1, name: "Verb" }] }))?.kind).toBe("Verb");
    expect(toFooterWord(word("a"))?.kind).toBeNull();
  });

  it("has no example when none is written, and no word without a meaning", () => {
    expect(toFooterWord(word("a", { examples: [] }))?.example).toBeNull();
    expect(toFooterWord(word("a", { translations: [] }))).toBeNull();
    expect(toFooterWord(word("a", { translations: null }))).toBeNull();
  });
});

describe("pickFooterWords", () => {
  it("never returns the excluded slug", () => {
    for (let seed = 1; seed < 30; seed++) {
      const picked = pickFooterWords(pool(10), "w3", 30, seeded(seed));
      expect(picked.map((w) => w.slug)).not.toContain("w3");
      expect(picked).toHaveLength(9);
    }
  });

  it("returns at most count words, all different", () => {
    const picked = pickFooterWords(pool(100), undefined, 30, seeded(7));
    expect(picked).toHaveLength(30);
    expect(new Set(picked.map((w) => w.slug)).size).toBe(30);
  });

  it("copes with fewer words than count, an empty pool and an unknown exclude slug", () => {
    expect(pickFooterWords(pool(3), "nope", 30, seeded(1))).toHaveLength(3);
    expect(pickFooterWords([], "nope")).toEqual([]);
  });

  it("skips words without a meaning", () => {
    const words = [word("a"), word("b", { translations: [] })];
    expect(pickFooterWords(words, undefined, 30, seeded(1)).map((w) => w.slug)).toEqual(["a"]);
  });

  it("is deterministic for a seeded random source and shuffles", () => {
    expect(pickFooterWords(pool(20), undefined, 30, seeded(5))).toEqual(
      pickFooterWords(pool(20), undefined, 30, seeded(5)),
    );
    expect(pickFooterWords(pool(20), undefined, 30, seeded(5))).not.toEqual(
      pickFooterWords(pool(20), undefined, 30, seeded(6)),
    );
  });
});

describe("createWordCycle", () => {
  const words = pickFooterWords(pool(5), undefined, 30, seeded(2));

  it("starts with the first word", () => {
    expect(createWordCycle(words, seeded(1)).current).toBe(words[0]);
  });

  it("shows every other word once before any repeats", () => {
    const cycle = createWordCycle(words, seeded(3));
    const seen = [cycle.current!.slug];
    for (let i = 0; i < words.length - 1; i++) seen.push(cycle.next()!.slug);
    expect(new Set(seen).size).toBe(words.length);
  });

  it("never shows the same word twice in a row, also across reshuffles", () => {
    const cycle = createWordCycle(words, seeded(4));
    let last = cycle.current!.slug;
    for (let i = 0; i < 60; i++) {
      const next = cycle.next()!.slug;
      expect(next).not.toBe(last);
      last = next;
    }
  });

  it("keeps the only word of a one-word list and survives an empty list", () => {
    const one = createWordCycle(words.slice(0, 1), seeded(1));
    expect(one.next()).toBe(words[0]);
    const none = createWordCycle([], seeded(1));
    expect(none.current).toBeNull();
    expect(none.next()).toBeNull();
  });
});
