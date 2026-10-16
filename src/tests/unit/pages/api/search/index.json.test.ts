import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({ SHOW_TEST_DATA: false }));

const { fetchAllWords } = vi.hoisted(() => ({ fetchAllWords: vi.fn() }));
vi.mock("@services/api.ts", () => ({ fetchAllWords }));

import type { APIContext } from "astro";

import type { BerlinerWord } from "@/types/cms";

import { GET, getSearchIndexEntries, makeOramaSearchIndex } from "@/pages/api/search/index.json.ts";

function makeWord(overrides: Partial<BerlinerWord> = {}): BerlinerWord {
  return {
    berlinerWordId: 1,
    berlinerischThemen: null,
    berlinerischWordTypes: null,
    dateGmt: "2025-01-01T00:00:00",
    id: "1",
    modifiedGmt: "2025-01-01T00:00:00",
    seo: null,
    slug: "wat",
    title: "Wat",
    wordGroup: "",
    wordProperties: {
      alternativeWords: null,
      article: null,
      berlinerisch: "wat",
      berlinerischAudio: null,
      berolinismus: false,
      examples: null,
      images: null,
      infoText: null,
      learnMore: null,
      relatedWords: null,
      translations: null,
      wikimediaFiles: null,
    },
    ...overrides,
  } as unknown as BerlinerWord;
}

describe("makeOramaSearchIndex — themen extraction", () => {
  it("returns empty themen array when berlinerischThemen is null", () => {
    const result = makeOramaSearchIndex(makeWord({ berlinerischThemen: null }));
    expect(result.themen).toEqual([]);
  });

  it("extracts slugs and filters out null slugs", () => {
    const result = makeOramaSearchIndex(
      makeWord({
        berlinerischThemen: {
          nodes: [
            { name: "Essen", slug: "essen-trinken" },
            { name: "Ohne Slug", slug: null },
          ],
        },
      } as unknown as Partial<BerlinerWord>),
    );
    expect(result.themen).toEqual(["essen-trinken"]);
  });

  it("does not throw when nodes is null", () => {
    const result = makeOramaSearchIndex(
      makeWord({ berlinerischThemen: { nodes: null } } as unknown as Partial<BerlinerWord>),
    );
    expect(result.themen).toEqual([]);
  });
});

describe("makeOramaSearchIndex — word properties", () => {
  it("derives suffix components for compound word search", () => {
    const result = makeOramaSearchIndex(
      makeWord({ wordProperties: { berlinerisch: "Bierpinsel" } } as never),
    );
    expect(result.wordComponents).toContain("pinsel");
    expect(result.wordComponents).toContain("erpinsel");
  });

  it("handles an empty headword", () => {
    const result = makeOramaSearchIndex(
      makeWord({ wordProperties: { berlinerisch: "" } } as never),
    );
    expect(result.wordProperties.syllablesCount).toBe(0);
    expect(result.wordProperties.characterLength).toBe(0);
    expect(result.wordComponents).toEqual([]);
  });

  it("uses 0 timestamps when the dates are missing and parses them otherwise", () => {
    const missing = makeOramaSearchIndex(makeWord({ dateGmt: null, modifiedGmt: null } as never));
    expect([missing.dateTs, missing.modifiedTs]).toEqual([0, 0]);
    const present = makeOramaSearchIndex(makeWord({ dateGmt: "2025-01-01T00:00:00Z" }));
    expect(present.dateTs).toBe(Date.parse("2025-01-01T00:00:00Z"));
  });

  it("reads WP-format dates (no zone) as UTC, independent of the server's timezone", () => {
    const result = makeOramaSearchIndex(
      makeWord({ dateGmt: "2025-04-09T08:12:37", modifiedGmt: "2026-09-20T17:24:19" } as never),
    );
    expect(result.dateTs).toBe(Date.UTC(2025, 3, 9, 8, 12, 37));
    expect(result.modifiedTs).toBe(Date.UTC(2026, 8, 20, 17, 24, 19));
  });

  it("flags audio, example audio, alternative words and berolinismus", () => {
    const result = makeOramaSearchIndex(
      makeWord({
        wordProperties: {
          alternativeWords: [{ word: "x" }],
          berlinerisch: "wat",
          berlinerischAudio: { url: "a.mp3" },
          berolinismus: true,
          examples: [{ exampleAudio: [{ url: "e.mp3" }] }],
        },
      } as never),
    );
    expect(result.wordProperties).toMatchObject({
      audioBerlinerisch: true,
      audioExamples: true,
      berolinismus: true,
      multipleMeanings: true,
    });
  });

  it("reports no example audio when examples lack audio", () => {
    const result = makeOramaSearchIndex(
      makeWord({
        wordProperties: { berlinerisch: "wat", examples: [{ exampleAudio: [] }] },
      } as never),
    );
    expect(result.wordProperties.audioExamples).toBe(false);
  });

  it("falls back to an empty word group", () => {
    expect(makeOramaSearchIndex(makeWord({ wordGroup: null } as never)).wordGroup).toBe("");
  });
});

describe("makeOramaSearchIndex — stored derived fields", () => {
  const derived = {
    characterLength: 11,
    consonantsCount: 7,
    nlpTags: [{ Verb: ["Verb", "Präsens"] }, { Noun: ["Verb"] }],
    soundexCode: "W300",
    syllablesCount: 9,
    vowelsCount: 5,
    wordComponents: ["stored"],
    wordGroup: "W",
  };

  it("takes counts, components and word types from the stored fields instead of computing them", () => {
    const result = makeOramaSearchIndex(makeWord({ derived, wordGroup: "W" } as never));
    expect(result.wordProperties).toMatchObject({
      characterLength: 11,
      consonantsCount: 7,
      syllablesCount: 9,
      vowelsCount: 5,
    });
    expect(result.wordComponents).toEqual(["stored"]);
    expect(result.berlinerischWordTypes).toEqual(["Verb", "Präsens"]);
  });

  it("keeps the public index slim: no definitions, examples, sources or info text", () => {
    const result = makeOramaSearchIndex(
      makeWord({
        derived,
        wordProperties: {
          berlinerisch: "wat",
          examples: [{ example: "geheim" }],
          infoText: "<p>geheim</p>",
          sources: [{ quelle: ["geheim"] }],
        },
      } as never),
    );
    expect(Object.keys(result).sort()).toEqual(
      [
        "berlinerischWordTypes",
        "berlinerWordId",
        "dateTs",
        "modifiedTs",
        "slug",
        "themen",
        "wordComponents",
        "wordGroup",
        "wordProperties",
      ].sort(),
    );
    expect(Object.keys(result.wordProperties).sort()).toEqual(
      [
        "audioBerlinerisch",
        "audioExamples",
        "berlinerisch",
        "berolinismus",
        "characterLength",
        "consonantsCount",
        "multipleMeanings",
        "syllablesCount",
        "translations",
        "vowelsCount",
      ].sort(),
    );
    expect(JSON.stringify(result)).not.toContain("geheim");
  });
});

describe("search index entries + GET", () => {
  it("maps a words array once and serves the entries as JSON", async () => {
    fetchAllWords.mockResolvedValue([makeWord()]);
    const first = await getSearchIndexEntries();
    const second = await getSearchIndexEntries();
    expect(second).toBe(first);

    const body = await (await GET({} as APIContext)).json();
    expect(body).toHaveLength(1);
    expect(body[0].slug).toBe("wat");
  });
});
