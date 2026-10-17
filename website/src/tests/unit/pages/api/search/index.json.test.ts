import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({ SHOW_TEST_DATA: false }));

const { fetchAllWords } = vi.hoisted(() => ({ fetchAllWords: vi.fn() }));
vi.mock("@services/api.ts", () => ({ fetchAllWords }));

import type { SiteWord } from "@services/payload/words.ts";
import type { APIContext } from "astro";

import { GET, getSearchIndexEntries, makeOramaSearchIndex } from "@/pages/api/search/index.json.ts";

/** A SiteWord (see services/payload/words.ts): repeaters and relations are arrays, dates ISO. */
function makeWord(overrides: Record<string, unknown> = {}): SiteWord {
  return {
    alternativeWords: [],
    article: null,
    berlinerisch: "wat",
    berlinerischAudio: [],
    berolinismus: false,
    contentModifiedAt: "2025-01-01T00:00:00.000Z",
    examples: [],
    globalId: btoa("post:1"),
    id: 1,
    images: [],
    infoTextHtml: null,
    learnMore: null,
    publishedAt: "2025-01-01T00:00:00.000Z",
    relatedWords: [],
    slug: "wat",
    sources: [],
    themen: [],
    translations: [],
    wikimediaFiles: [],
    wordTypes: [],
    ...overrides,
  } as unknown as SiteWord;
}

const audio = { audio: { id: 1, url: "https://cms.example/a.mp3" }, gender: "female" };

describe("makeOramaSearchIndex — themen extraction", () => {
  it("returns an empty themen array for a word without themen", () => {
    expect(makeOramaSearchIndex(makeWord()).themen).toEqual([]);
  });

  it("extracts slugs and filters out missing slugs", () => {
    const result = makeOramaSearchIndex(
      makeWord({
        themen: [
          { id: 1, name: "Essen", slug: "essen-trinken" },
          { id: 2, name: "Ohne Slug", slug: null },
        ],
      }),
    );
    expect(result.themen).toEqual(["essen-trinken"]);
  });
});

describe("makeOramaSearchIndex — word properties", () => {
  it("derives suffix components for compound word search", () => {
    const result = makeOramaSearchIndex(makeWord({ berlinerisch: "Bierpinsel" }));
    expect(result.wordComponents).toContain("pinsel");
    expect(result.wordComponents).toContain("erpinsel");
  });

  it("handles an empty headword", () => {
    const result = makeOramaSearchIndex(makeWord({ berlinerisch: "" }));
    expect(result.wordProperties.syllablesCount).toBe(0);
    expect(result.wordProperties.characterLength).toBe(0);
    expect(result.wordComponents).toEqual([]);
  });

  it("uses 0 timestamps when the dates are missing and parses them otherwise", () => {
    const missing = makeOramaSearchIndex(makeWord({ contentModifiedAt: null, publishedAt: null }));
    expect([missing.dateTs, missing.modifiedTs]).toEqual([0, 0]);
    const present = makeOramaSearchIndex(makeWord({ publishedAt: "2025-01-01T00:00:00.000Z" }));
    expect(present.dateTs).toBe(Date.parse("2025-01-01T00:00:00Z"));
  });

  it("stores the dates as epoch ms, 0 when missing", () => {
    const result = makeOramaSearchIndex(
      makeWord({
        contentModifiedAt: "2026-09-20T17:24:19.987Z",
        publishedAt: "2025-04-09T08:12:37.123Z",
      }),
    );
    expect(result.dateTs).toBe(Date.UTC(2025, 3, 9, 8, 12, 37, 123));
    expect(result.modifiedTs).toBe(Date.UTC(2026, 8, 20, 17, 24, 19, 987));
    expect(makeOramaSearchIndex(makeWord({ publishedAt: null })).dateTs).toBe(0);
  });

  it("flags audio, example audio, alternative words and berolinismus", () => {
    const result = makeOramaSearchIndex(
      makeWord({
        alternativeWords: [{ alternativeWord: "x" }],
        berlinerischAudio: [audio],
        berolinismus: true,
        examples: [{ example: "e", exampleAudio: [audio] }],
      }),
    );
    expect(result.wordProperties).toMatchObject({
      audioBerlinerisch: true,
      audioExamples: true,
      berolinismus: true,
      multipleMeanings: true,
    });
  });

  it("reports no audio and no multiple meanings for empty repeaters", () => {
    const result = makeOramaSearchIndex(makeWord({ examples: [{ exampleAudio: [] }] }));
    expect(result.wordProperties).toMatchObject({
      audioBerlinerisch: false,
      audioExamples: false,
      multipleMeanings: false,
    });
  });

  it("lists the non-empty translations as strings", () => {
    const result = makeOramaSearchIndex(
      makeWord({ translations: [{ translation: "was" }, { translation: "" }, { translation: null }] }),
    );
    expect(result.wordProperties.translations).toEqual(["was"]);
  });

  it("falls back to an empty word group", () => {
    expect(makeOramaSearchIndex(makeWord({ derived: { wordGroup: null } })).wordGroup).toBe("");
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

  it("takes counts, components, word group and word types from the stored fields", () => {
    const result = makeOramaSearchIndex(makeWord({ derived }));
    expect(result.wordProperties).toMatchObject({
      characterLength: 11,
      consonantsCount: 7,
      syllablesCount: 9,
      vowelsCount: 5,
    });
    expect(result.wordComponents).toEqual(["stored"]);
    expect(result.wordGroup).toBe("W");
    expect(result.berlinerischWordTypes).toEqual(["Verb", "Präsens"]);
  });

  it("keeps the public index slim: no definitions, examples, sources or info text", () => {
    const result = makeOramaSearchIndex(
      makeWord({
        derived,
        examples: [{ example: "geheim", exampleAudio: [] }],
        infoTextHtml: "<p>geheim</p>",
        sources: ["geheim"],
      }),
    );
    expect(Object.keys(result).sort()).toEqual(
      [
        "berlinerischWordTypes",
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
