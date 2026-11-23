import type { WordPageModel } from "@services/payload/wordPage.ts";

import { grammarRows, klangRows, numbers } from "@lib/wordAnalysis.ts";
import { describe, expect, it } from "vitest";

// Invented data only.
const model = (over: Partial<WordPageModel> = {}, word: Record<string, unknown> = {}) =>
  ({
    grammar: {},
    rhymes: [],
    syllables: ["Test", "wort"],
    word: {
      article: "das",
      berlinerisch: "Testwort",
      derived: { nlpTags: [] },
      wordTypes: [{ id: 1, name: "Substantiv" }],
      ...word,
    },
    ...over,
  }) as unknown as WordPageModel;

describe("grammarRows", () => {
  it("drops every row without a value", () => {
    expect(grammarRows(model({}, { article: null })).map((r) => r.label)).toEqual(["Wortart"]);
  });

  it("builds Wortart, Genus, Plural and the Verkleinerung link", () => {
    const rows = grammarRows(
      model({
        grammar: {
          diminutive: { label: "Testwörtchen", url: "/wort/testwoertchen" },
          plural: "die Testwörter",
        },
      }),
    );
    expect(rows.map((r) => r.label)).toEqual(["Wortart", "Genus", "Plural", "Verkleinerung"]);
    expect(rows[1]).toMatchObject({ text: "neutral, das Testwort" });
    expect(rows[3]?.links).toEqual([{ label: "Testwörtchen", url: "/wort/testwoertchen" }]);
  });

  it("reads the word type like the head: editorial first, else the guess marked geraten", () => {
    const guessed = model({}, { derived: { nlpTags: [{ testwort: ["Nomen"] }] }, wordTypes: [] });
    expect(grammarRows(guessed)[0]).toMatchObject({ text: "Nomen (geraten)" });
  });

  it("is empty when nothing is known", () => {
    expect(grammarRows(model({}, { article: null, wordTypes: [] }))).toEqual([]);
  });
});

describe("klangRows", () => {
  it("omits the rhyme row without rhymes and the rows without a value", () => {
    expect(klangRows(model()).map((r) => r.label)).toEqual(["Silben"]);
  });

  it("builds Silben, Lautschrift, Betonung and the rhyme links", () => {
    const rows = klangRows(
      model({
        ipa: "[tɛst]",
        rhymes: [{ label: "Reimwort", url: "/wort/reimwort" }],
        stress: "erste Silbe",
      }),
    );
    expect(rows.map((r) => r.label)).toEqual([
      "Silben",
      "Lautschrift",
      "Betonung",
      "Reimt sich auf",
    ]);
    expect(rows[0]).toMatchObject({ text: "Test·wort" });
    expect(rows[3]?.links).toEqual([{ label: "Reimwort", url: "/wort/reimwort" }]);
  });
});

describe("numbers", () => {
  it("makes one column per letter, 1 dot = 2 %, at least one, vowels marked", () => {
    const { columns } = numbers(model({ syllables: ["a", "e"] }, { berlinerisch: "Ae" }));
    expect(columns.map((c) => [c.ch, c.dots, c.vowel])).toEqual([
      ["A", 3, true], // 6.51 %
      ["e", 9, true], // 17.4 %
    ]);
  });

  it("gives the four figures", () => {
    const { figures } = numbers(
      model({ syllables: ["Test", "wort"] }, { berlinerisch: "Testwort" }),
    );
    expect(figures).toEqual([
      { label: "Buchstaben", value: 8 },
      { label: "Silben", value: 2 },
      { label: "Vokale", value: 2 },
      { label: "Konsonanten", value: 6 },
    ]);
  });
});
