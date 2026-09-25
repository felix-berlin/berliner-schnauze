import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSearchIndexEntries, fetchAllThemen } = vi.hoisted(() => ({
  fetchAllThemen: vi.fn(),
  getSearchIndexEntries: vi.fn(),
}));

vi.mock("@services/api.ts", () => ({ fetchAllThemen }));
vi.mock("@/pages/api/search/index.json.ts", () => ({ getSearchIndexEntries }));

import type { APIContext } from "astro";

import { GET } from "@/pages/api/search/meta.json.ts";

const entry = (over: {
  wordGroup?: string;
  types?: string[];
  chars?: number;
  consonants?: number;
  syllables?: number;
  vowels?: number;
}) => ({
  berlinerischWordTypes: over.types ?? [],
  wordGroup: over.wordGroup ?? "",
  wordProperties: {
    characterLength: over.chars ?? 0,
    consonantsCount: over.consonants ?? 0,
    syllablesCount: over.syllables ?? 0,
    vowelsCount: over.vowels ?? 0,
  },
});

const getMeta = async () => (await GET({} as APIContext)).json();

describe("meta.json GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAllThemen.mockResolvedValue([]);
  });

  it("aggregates min/max ranges over all entries", async () => {
    getSearchIndexEntries.mockResolvedValue([
      entry({ chars: 3, consonants: 2, syllables: 1, vowels: 1 }),
      entry({ chars: 12, consonants: 8, syllables: 4, vowels: 4 }),
    ]);
    const meta = await getMeta();
    expect(meta.rangeFilterMinMax).toEqual({
      characterLength: { max: 12, min: 3 },
      consonantsCount: { max: 8, min: 2 },
      syllablesCount: { max: 4, min: 1 },
      vowelsCount: { max: 4, min: 1 },
    });
  });

  it("falls back to 0/0 ranges when there are no entries", async () => {
    getSearchIndexEntries.mockResolvedValue([]);
    const meta = await getMeta();
    expect(meta.rangeFilterMinMax.characterLength).toEqual({ max: 0, min: 0 });
    expect(meta.availableWordGroups).toEqual([]);
    expect(meta.wordTypes).toEqual([]);
  });

  it("dedupes, uppercases and sorts word groups, dropping empty ones", async () => {
    getSearchIndexEntries.mockResolvedValue([
      entry({ wordGroup: "verb" }),
      entry({ wordGroup: "Adjektiv" }),
      entry({ wordGroup: "VERB" }),
      entry({ wordGroup: "" }),
    ]);
    expect((await getMeta()).availableWordGroups).toEqual(["ADJEKTIV", "VERB"]);
  });

  it("dedupes and sorts word types", async () => {
    getSearchIndexEntries.mockResolvedValue([
      entry({ types: ["Verb", "Nomen"] }),
      entry({ types: ["Nomen", ""] }),
    ]);
    expect((await getMeta()).wordTypes).toEqual(["Nomen", "Verb"]);
  });

  it("keeps only themen with name and slug, sorted by name (de)", async () => {
    getSearchIndexEntries.mockResolvedValue([]);
    fetchAllThemen.mockResolvedValue([
      { name: "Zoo", slug: "zoo" },
      { name: "Ärger", slug: "aerger" },
      { name: "Ohne Slug", slug: null },
      { name: null, slug: "ohne-name" },
    ]);
    expect((await getMeta()).themen).toEqual([
      { name: "Ärger", slug: "aerger" },
      { name: "Zoo", slug: "zoo" },
    ]);
  });
});
