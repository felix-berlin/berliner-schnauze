// @vitest-environment node
import { search } from "@orama/orama";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchSearchIndex = vi.fn();
vi.mock("@services/searchIndex.ts", () => ({ fetchSearchIndex }));

// Invented entries: the full shape the schema expects.
const entry = (slug: string, berlinerisch: string, translations: string[]) => ({
  berlinerischWordTypes: [],
  dateTs: 0,
  modifiedTs: 0,
  slug,
  themen: [],
  wordComponents: [],
  wordGroup: berlinerisch[0]!.toUpperCase(),
  wordProperties: {
    audioBerlinerisch: false,
    audioExamples: false,
    berlinerisch,
    berolinismus: false,
    characterLength: berlinerisch.length,
    consonantsCount: 0,
    multipleMeanings: false,
    syllablesCount: 0,
    translations,
    vowelsCount: 0,
  },
});
const INDEX = [
  entry("kroemel", "Krömelkiste", ["Brotkasten"]),
  entry("schnuppel", "Schnuppel", ["Gebäck"]),
];

// The Orama DB is a module-level single-flight: every test loads a fresh module.
const load = async () => {
  vi.resetModules();
  return import("@services/wordSearchDb.ts");
};

beforeEach(() => fetchSearchIndex.mockReset());

describe("getWordDb", () => {
  it("fetches once for concurrent callers and reports the indexed size", async () => {
    fetchSearchIndex.mockResolvedValue(INDEX);
    const { getWordDb } = await load();
    const [a, b] = await Promise.all([getWordDb(), getWordDb()]);
    expect(fetchSearchIndex).toHaveBeenCalledTimes(1);
    expect(a.db).toBe(b.db);
    expect(a.size).toBe(INDEX.length);
  });

  it("clears the failed attempt so the next call retries", async () => {
    fetchSearchIndex.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(INDEX);
    const { getWordDb } = await load();
    await expect(getWordDb()).rejects.toThrow("offline");
    expect((await getWordDb()).size).toBe(2);
    expect(fetchSearchIndex).toHaveBeenCalledTimes(2);
  });
});

describe("FULL_TEXT", () => {
  it("searches exactly the user-facing text fields, shared by the word list and the start page", async () => {
    fetchSearchIndex.mockResolvedValue(INDEX);
    const { FULL_TEXT, getWordDb } = await load();
    expect(FULL_TEXT.properties).toEqual([
      "wordComponents",
      "wordProperties.berlinerisch",
      "wordProperties.translations",
    ]);
    const { db } = await getWordDb();
    const byLemma = await search(db, { ...FULL_TEXT, term: "Krömelkiste" });
    const byMeaning = await search(db, { ...FULL_TEXT, term: "Brotkasten" });
    expect(byLemma.hits[0]?.document.slug).toBe("kroemel");
    expect(byMeaning.hits[0]?.document.slug).toBe("kroemel");
  });
});
