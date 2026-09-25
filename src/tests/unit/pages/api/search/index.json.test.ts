import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({
  SHOW_TEST_DATA: false,
  WP_API: "http://test.local/graphql",
  WP_REST_API: "http://test.local/wp-json",
}));
vi.mock("astro:env/server", () => ({ WP_AUTH_PASS: "test", WP_AUTH_USER: "test" }));

const { fetchAllWords } = vi.hoisted(() => ({ fetchAllWords: vi.fn() }));
vi.mock("@services/api.ts", () => ({ fetchAllWords }));

import type { APIContext } from "astro";

import type { BerlinerWord } from "@/gql/entity-types";

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

describe("search index entries + GET", () => {
  it("builds entries once and serves them as JSON", async () => {
    fetchAllWords.mockResolvedValue([makeWord()]);
    const first = await getSearchIndexEntries();
    const second = await getSearchIndexEntries();
    expect(second).toBe(first);
    expect(fetchAllWords).toHaveBeenCalledOnce();

    const body = await (await GET({} as APIContext)).json();
    expect(body).toHaveLength(1);
    expect(body[0].slug).toBe("wat");
  });
});
