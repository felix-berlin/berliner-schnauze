import type { SearchEntry } from "@lib/search/types";

import { normalize, soundex, terms } from "@lib/search/query";
import { FUZZY_BELOW, rankHits, tierOf, withDividers } from "@lib/search/rank";
import { soundexCode } from "payload-app/word-derived";
import { describe, expect, it } from "vitest";

const makeEntry = ({
  berlinerisch,
  translations = [],
  soundex: sx = "",
}: {
  berlinerisch: string;
  translations?: string[];
  soundex?: string;
}) =>
  ({
    form: { length: berlinerisch.length, soundex: sx, syllables: 1 },
    slug: normalize(berlinerisch),
    wordProperties: { berlinerisch, translations },
  }) as unknown as SearchEntry;

const base = [
  makeEntry({ berlinerisch: "Brötchen" }),
  makeEntry({ berlinerisch: "Brötchenbude" }),
  makeEntry({ berlinerisch: "Splitterbrötchen" }),
  makeEntry({ berlinerisch: "Schrippe", translations: ["Brötchen"] }),
  makeEntry({ berlinerisch: "Knüppel", translations: ["längliches Brötchen"] }),
];

describe("search ranking", () => {
  it("orders exact > prefix > contains > meaning-exact > meaning-part", () => {
    const shuffled = [...base].reverse();
    const hits = rankHits(shuffled, "brötchen");
    expect(hits.map((h) => h.tier)).toEqual([0, 1, 2, 3, 4]);
    expect(hits.map((h) => h.entry.wordProperties.berlinerisch)).toEqual(
      base.map((e) => e.wordProperties.berlinerisch),
    );
  });

  it("breaks ties by score", () => {
    const a = makeEntry({ berlinerisch: "Brotkorb" });
    const b = makeEntry({ berlinerisch: "Brotkasten" });
    const hits = rankHits(
      [a, b],
      "brot",
      new Map([
        [b.slug, 2],
        [a.slug, 1],
      ]),
    );
    expect(hits.map((h) => h.entry.slug)).toEqual([b.slug, a.slug]);
  });

  it("puts the divider exactly between word and meaning hits", () => {
    const rows = withDividers(rankHits(base, "brötchen"));
    expect(rows[3]).toEqual({ kind: "divider", label: "Ab hier: Treffer in der Bedeutung" });
    expect(rows.filter((r) => r.kind === "divider")).toHaveLength(1);
    expect(
      withDividers(rankHits(base.slice(0, 3), "brötchen")).some((r) => r.kind === "divider"),
    ).toBe(false);
    expect(
      withDividers(rankHits(base.slice(3), "brötchen")).some((r) => r.kind === "divider"),
    ).toBe(false);
  });

  it("shows fuzzy only below 5 hits", () => {
    const neighbour = makeEntry({ berlinerisch: "Brodschen", soundex: soundex("brötchen") });
    const rows = withDividers(rankHits([neighbour, ...base.slice(0, 2)], "brötchen"));
    expect(rows.at(-2)).toEqual({ kind: "divider", label: "Klingt ähnlich" });
    expect(rows.at(-1)).toMatchObject({ hit: { tier: 5 }, kind: "hit" });
    expect(FUZZY_BELOW).toBe(5);
    expect(rankHits([neighbour, ...base], "brötchen").some((h) => h.tier === 5)).toBe(false);
  });

  it("jeh is not geh", () => {
    const e = makeEntry({ berlinerisch: "Jehen", soundex: soundex("jehen") });
    expect(tierOf(e, "gehen")).toBeNull();
  });

  it("treats ß and ss alike", () => {
    const e = makeEntry({ berlinerisch: "abbeißen", translations: ["Straße"] });
    expect(tierOf(e, "abbeissen")).toBe(0);
    expect(tierOf(makeEntry({ berlinerisch: "Abbeisser" }), "abbeißer")).toBe(0);
    expect(tierOf(e, "strasse")).toBe(3);
    // Capital ẞ lowercases to ß first: "STRAẞENBAHN" covers "strassen".
    expect(
      tierOf(makeEntry({ berlinerisch: "Tram", translations: ["Die STRAẞENBAHN"] }), "strassen"),
    ).toBe(4);
  });

  it("handles a blank query", () => {
    expect(rankHits(base, "  ")).toEqual([]);
    expect(terms("-")).toEqual([]);
  });

  it("keeps the soundex copy in parity with payload-app", () => {
    for (const w of ["brötchen", "schrippe", "jehen", "gehen", "a", "stinkende füße", "ä", "x1"]) {
      expect(soundex(w)).toBe(soundexCode(w));
    }
  });

  it("normalizes decomposed umlauts to NFC", () => {
    expect(normalize("Bro\u0308tchen")).toBe("brötchen");
  });
});
