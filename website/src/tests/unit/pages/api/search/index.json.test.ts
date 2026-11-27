import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({ SHOW_TEST_DATA: false }));

vi.mock("@services/searchStats.ts", () => ({ searchStatsOrEmpty: async () => new Map() }));

const { fetchAllWords } = vi.hoisted(() => ({ fetchAllWords: vi.fn() }));
vi.mock("@services/payload/words.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@services/payload/words.ts")>()),
  fetchAllWords,
}));

import type { SiteWord } from "@services/payload/words.ts";
import type { APIContext } from "astro";

import { deriveWordFields } from "payload-app/word-derived";

import { GET, getSearchIndexEntries, makeOramaSearchIndex } from "@/pages/api/search/index.json.ts";

/** A SiteWord (see services/payload/words.ts): repeaters and relations are arrays, dates ISO, derived filled. */
function makeWord(overrides: Record<string, unknown> = {}): SiteWord {
  return {
    alternativeWords: [],
    article: null,
    berlinerisch: "wat",
    berlinerischAudio: [],
    berolinismus: false,
    contentModifiedAt: "2025-01-01T00:00:00.000Z",
    derived: deriveWordFields((overrides.berlinerisch as string | undefined) ?? "wat"),
    examples: [],
    globalId: btoa("post:1"),
    id: 1,
    images: [],
    learnMore: null,
    publishedAt: "2025-01-01T00:00:00.000Z",
    relatedWords: [],
    slug: "wat",
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
      makeWord({
        translations: [{ translation: "was" }, { translation: "" }, { translation: null }],
      }),
    );
    expect(result.wordProperties.translations).toEqual(["was"]);
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

  it("prefers the editor-set word types over the automatic ones", () => {
    const result = makeOramaSearchIndex(
      makeWord({ derived, wordTypes: [{ id: 1, name: "Nomen" }] }),
    );
    expect(result.berlinerischWordTypes).toEqual(["Nomen"]);
  });

  it("keeps the public index slim: no definitions or examples", () => {
    const result = makeOramaSearchIndex(
      makeWord({
        derived,
        examples: [{ example: "geheim", exampleAudio: [] }],
      }),
    );
    expect(Object.keys(result).sort()).toEqual(
      [
        "article",
        "berlinerischWordTypes",
        "dateTs",
        "form",
        "has",
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

describe("makeOramaSearchIndex — usage, content flags and form", () => {
  const full = {
    berlinerischAudio: [audio],
    examples: [{ example: "e", exampleAudio: [audio] }],
    facts: [{ html: "<p>x</p>" }],
    images: [{ id: 1 }],
    related: [{ label: "x" }],
  };

  it("sets has.gap when only related is empty", () => {
    expect(makeOramaSearchIndex(makeWord(full)).has.gap).toBe(false);
    expect(makeOramaSearchIndex(makeWord({ ...full, related: [] })).has.gap).toBe(true);
  });

  it("sets has.gap for no example, no fact or no word audio", () => {
    for (const missing of [{ examples: [] }, { facts: [] }, { berlinerischAudio: [] }]) {
      expect(makeOramaSearchIndex(makeWord({ ...full, ...missing })).has.gap).toBe(true);
    }
  });

  it("derives the content flags and stories from the stats", () => {
    const entry = makeOramaSearchIndex(makeWord(full), { stories: 2 });
    expect(entry.has).toEqual({
      examples: true,
      examplesAudio: true,
      facts: true,
      gap: false,
      images: true,
      stories: true,
    });
    expect(makeOramaSearchIndex(makeWord(full), { stories: 0 }).has.stories).toBe(false);
  });

  it("omits usage without stats and carries it with stats", () => {
    expect("usage" in makeOramaSearchIndex(makeWord())).toBe(false);
    const usage = { say: 0.6, votes: 12 };
    expect(makeOramaSearchIndex(makeWord(), { stories: 0, usage }).usage).toEqual(usage);
  });

  it("fills article and form, preferring the stored soundex", () => {
    const stored = makeOramaSearchIndex(makeWord({ article: "die" }));
    expect(stored.article).toBe("die");
    expect(makeOramaSearchIndex(makeWord()).article).toBe("");
    expect(stored.form).toEqual({ length: 3, soundex: "W300", syllables: 1 });
    const noCode = makeWord();
    noCode.derived = { ...noCode.derived, soundexCode: undefined } as typeof noCode.derived;
    expect(makeOramaSearchIndex(noCode).form.soundex).toBe("W300");
  });

  it("serializes no feedback row fields", () => {
    const json = JSON.stringify(
      makeOramaSearchIndex(makeWord(full), { stories: 1, usage: { say: 1, votes: 10 } }),
    );
    for (const key of ["visitor", "locality", "origin"]) expect(json).not.toContain(key);
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
