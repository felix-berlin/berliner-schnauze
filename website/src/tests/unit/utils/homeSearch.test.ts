import { groupHits, highlight, searchUrl, suggestUrl } from "@utils/homeSearch.ts";
import { describe, expect, it } from "vitest";

import type { OramaSearchIndex } from "@/pages/api/search/index.json";

// Invented entries: only the fields the helpers read.
const doc = (slug: string, berlinerisch: string, translations: string[]) =>
  ({ slug, wordProperties: { berlinerisch, translations } }) as OramaSearchIndex;

describe("highlight", () => {
  it("marks the query case-insensitively", () => {
    expect(highlight("Wasserbrötchen", "Brö")).toEqual([
      { mark: false, text: "Wasser" },
      { mark: true, text: "brö" },
      { mark: false, text: "tchen" },
    ]);
  });

  it("marks every occurrence and a leading match", () => {
    expect(highlight("ab ab", "ab").filter((p) => p.mark)).toHaveLength(2);
    expect(highlight("Bröselbrö", "brö")[0]).toEqual({ mark: true, text: "Brö" });
  });

  it("treats regex characters literally and returns plain text without a hit", () => {
    expect(highlight("a.b", ".")).toEqual([
      { mark: false, text: "a" },
      { mark: true, text: "." },
      { mark: false, text: "b" },
    ]);
    expect(highlight("Stulle", "xyz")).toEqual([{ mark: false, text: "Stulle" }]);
    expect(highlight("Stulle", "  ")).toEqual([{ mark: false, text: "Stulle" }]);
  });
});

describe("groupHits", () => {
  it("splits lemma hits from meaning hits and shows the matching meaning", () => {
    const groups = groupHits(
      [
        doc("schrippe", "Schrippe", ["Brötchen"]),
        doc("broesel", "Brösel", ["Krümel"]),
        doc("knueppel", "Knüppel", ["Stock", "längliches Brötchen"]),
      ],
      "brö",
    );
    expect(groups.lemma).toEqual([{ lemma: "Brösel", meaning: "Krümel", slug: "broesel" }]);
    expect(groups.meaning).toEqual([
      { lemma: "Schrippe", meaning: "Brötchen", slug: "schrippe" },
      { lemma: "Knüppel", meaning: "längliches Brötchen", slug: "knueppel" },
    ]);
  });

  it("keeps fuzzy hits without a literal match in the lemma group", () => {
    const groups = groupHits([doc("stulle", "Stulle", [])], "stule");
    expect(groups.lemma).toEqual([{ lemma: "Stulle", meaning: "", slug: "stulle" }]);
    expect(groups.meaning).toEqual([]);
  });

  it("caps the list at 6 entries in total", () => {
    const docs = Array.from({ length: 9 }, (_, i) => doc(`w${i}`, `Wort${i}`, ["x"]));
    const { lemma, meaning } = groupHits(docs, "wort");
    expect(lemma.length + meaning.length).toBe(6);
  });
});

describe("urls", () => {
  it("builds the search page url from the trimmed, encoded query", () => {
    expect(searchUrl("  dicke Luft ")).toBe("/suche?q=dicke%20Luft");
    expect(searchUrl("Straße über")).toBe("/suche?q=Stra%C3%9Fe%20%C3%BCber");
    expect(searchUrl("a&b=c")).toBe("/suche?q=a%26b%3Dc");
  });

  it("builds the suggestion url with the term", () => {
    expect(suggestUrl(" schnudel ")).toBe("/wort-vorschlagen?wort=schnudel");
  });
});
