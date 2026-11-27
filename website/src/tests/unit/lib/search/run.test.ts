import type { SearchEntry } from "@lib/search/types";

import { runSearch, semanticCandidates } from "@lib/search/run";
import { EMPTY_STATE, type SearchState } from "@lib/search/state";
import { buildWordDb } from "@services/wordSearchDb";
import { describe, expect, it } from "vitest";

const make = (
  berlinerisch: string,
  translations: string[],
  extra: { group?: string; themen?: string[]; soundex?: string } = {},
) =>
  ({
    article: "",
    berlinerischWordTypes: [],
    dateTs: 0,
    form: { length: berlinerisch.length, soundex: extra.soundex ?? "", syllables: 1 },
    has: {
      examples: false,
      examplesAudio: false,
      facts: false,
      gap: false,
      images: false,
      stories: false,
    },
    modifiedTs: 0,
    slug: berlinerisch.toLowerCase(),
    themen: extra.themen ?? [],
    wordComponents: [],
    wordGroup: extra.group ?? berlinerisch[0]!.toUpperCase(),
    wordProperties: {
      audioBerlinerisch: false,
      audioExamples: false,
      berlinerisch,
      berolinismus: false,
      characterLength: berlinerisch.length,
      consonantsCount: 0,
      multipleMeanings: false,
      syllablesCount: 1,
      translations,
      vowelsCount: 0,
    },
  }) as SearchEntry;

const entries = [
  make("Zappel", ["Unruhe"], { themen: ["a"] }),
  make("Zappelbude", ["Unruheherd"], { themen: ["b"] }),
  make("Kruke", ["Zappel im Kopf"], { themen: ["a"] }),
  make("Ahle", ["Name"]),
  make("Anke", ["Name"]),
];
const ctx = { trendRanks: new Map<string, number>() };
const st = (o: Partial<SearchState> = {}): SearchState => ({ ...EMPTY_STATE, ...o });
const db = await buildWordDb(entries);

describe("runSearch", () => {
  it("adds letter rows without q", async () => {
    const r = await runSearch(db, entries, st(), ctx);
    const letters = r.rows.filter((x) => x.kind === "letter");
    expect(letters).toEqual([
      { count: 2, kind: "letter", letter: "A" },
      { count: 1, kind: "letter", letter: "K" },
      { count: 2, kind: "letter", letter: "Z" },
    ]);
    expect(r.total).toBe(5);
    expect(r.note).toBeNull();
  });

  it("uses dividers only in beste", async () => {
    const beste = await runSearch(db, entries, st({ q: "zappel" }), ctx);
    expect(beste.rows.some((x) => x.kind === "divider")).toBe(true);
    const az = await runSearch(db, entries, st({ q: "zappel", sort: "az" }), ctx);
    expect(az.rows.some((x) => x.kind === "divider")).toBe(false);
    expect(az.rows.some((x) => x.kind === "letter")).toBe(false);
  });

  it("applies filters to candidates", async () => {
    const r = await runSearch(db, entries, st({ q: "zappel", themes: ["b"] }), ctx);
    expect(r.rows.map((x) => x.kind === "hit" && x.hit.entry.slug)).toEqual(["zappelbude"]);
    expect(r.total).toBe(1);
  });

  it("suggests only on zero hits", async () => {
    const none = await runSearch(db, entries, st({ q: "zapel", themes: ["zzz"] }), ctx);
    expect(none.total).toBe(0);
    expect(none.suggestions.map((e) => e.slug)).toContain("zappel");
    expect(none.suggestions.length).toBeLessThanOrEqual(3);
    const some = await runSearch(db, entries, st({ q: "zappel" }), ctx);
    expect(some.suggestions).toEqual([]);
  });

  it("words the note per hit mix", async () => {
    expect((await runSearch(db, entries, st({ q: "zappel" }), ctx)).note).toBe(
      "erst im Wort, dann in der Bedeutung",
    );
    expect((await runSearch(db, entries, st({ q: "name" }), ctx)).note).toBe(
      "alle in der Bedeutung",
    );
    expect((await runSearch(db, entries, st({ q: "unruhe" }), ctx)).note).toBe(
      "alle in der Bedeutung",
    );
    expect((await runSearch(db, entries, st({ q: "kopf" }), ctx)).note).toBe(
      "Treffer in der Bedeutung, enthalten „kopf“",
    );
    expect((await runSearch(db, entries, st({ q: "ahle" }), ctx)).note).toBeNull();
  });
});

describe("semanticCandidates", () => {
  it("returns filtered candidates up to the limit", async () => {
    const all = await semanticCandidates(db, entries, st({ q: "zappel im kopf" }));
    expect(all.length).toBeGreaterThan(0);
    const filtered = await semanticCandidates(db, entries, st({ q: "zappel", themes: ["b"] }));
    expect(filtered.map((e) => e.slug)).toEqual(["zappelbude"]);
    expect(await semanticCandidates(db, entries, st({ q: "zappel" }), 1)).toHaveLength(1);
  });
});
