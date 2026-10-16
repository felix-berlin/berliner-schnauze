import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getPayload, find } = vi.hoisted(() => ({ find: vi.fn(), getPayload: vi.fn() }));
vi.mock("payload-app", () => ({ config: Promise.resolve({}), getPayload }));
vi.mock("astro:env/server", () => ({ PAYLOAD_SERVER_URL: "https://cms.example" }));
vi.mock("astro:env/client", () => ({ SHOW_TEST_DATA: false }));

const lexical = (value: string) => ({
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: value,
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        textFormat: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
});

const doc = {
  _status: "published",
  alternativeWords: [{ alternativeWord: "aasig" }],
  article: null,
  berlinerWordId: 5703,
  berlinerisch: "aasen",
  berlinerischAudio: [{ audio: { id: 4, url: "/api/media/file/b.mp3" }, gender: "female" }],
  berolinismus: true,
  contentModifiedAt: "2026-09-20T17:24:19.000Z",
  createdAt: "2026-10-01T00:00:00.000Z",
  derived: {
    characterLength: 5,
    consonantsCount: 2,
    nlpTags: [],
    soundexCode: "A250",
    syllablesCount: 2,
    vowelsCount: 3,
    wordComponents: ["asen"],
    wordGroup: "A",
  },
  examples: [
    {
      example: "Das war aasen.",
      exampleAudio: [{ audio: { id: 1, url: "/api/media/file/ex.mp3" }, gender: "male" }],
      exampleExplanation: "Erklärung",
    },
  ],
  id: 12,
  images: [
    {
      alt: "Küche",
      caption: "Tom & Jerry",
      description: lexical("CC BY-SA"),
      height: 1120,
      id: 2,
      url: "/api/media/file/k.png",
      width: 2000,
    },
    5,
  ],
  infoText: lexical("Adjektiv zu Aas"),
  learnMore: "https://example.org/mehr",
  meta: {
    canonical: null,
    description: "Meta",
    image: { id: 9, url: "/api/media/file/og.png" },
    nofollow: true,
    noindex: false,
    ogDescription: "OGD",
    ogTitle: "OG",
    title: "aasen",
    twitterDescription: "T",
    twitterTitle: null,
  },
  publishedAt: "2025-04-09T08:12:37.000Z",
  relatedWords: [
    { _status: "published", berlinerisch: "wa", id: 13, slug: "wa" },
    { _status: "draft", berlinerisch: "geheim", id: 15, slug: "geheim" },
    14,
  ],
  slug: "aasen",
  sources: ["Meyer", "Schlobinski"],
  themen: [{ id: 2, name: "Essen", slug: "essen" }],
  translations: [
    { translation: "sehr" },
    { translation: "" },
    { translation: null },
    { translation: "viel" },
  ],
  updatedAt: "2026-10-01T00:00:00.000Z",
  wikimediaFiles: [{ caption: "c", description: "d", wikimediaFile: "File:A.jpg" }],
  wordTypes: [{ id: 1, name: "Adjektiv" }],
};

const page = (docs: unknown[], nextPage: number | null = null) => ({
  docs,
  hasNextPage: nextPage !== null,
  nextPage,
});

beforeEach(() => {
  vi.resetModules();
  find.mockReset();
  getPayload.mockReset().mockResolvedValue({ find });
});
afterEach(() => vi.useRealTimers());

const load = () => import("@services/payload/words.ts");

describe("toWord", () => {
  it("maps a populated payload word to the shape the components read", async () => {
    const { toWord } = await load();
    const word = toWord(doc as never);
    expect(word).toMatchObject({
      berlinerWordId: 5703,
      berlinerischThemen: { nodes: [{ name: "Essen", slug: "essen" }] },
      berlinerischWordTypes: { nodes: [{ name: "Adjektiv" }] },
      // WP format: no milliseconds, no trailing Z (callers append "Z" themselves)
      dateGmt: "2025-04-09T08:12:37",
      // WP global id format ("post:<id>" base64): the JSON-LD identifier of every word stays as it was
      id: btoa("post:5703"),
      modifiedGmt: "2026-09-20T17:24:19",
      slug: "aasen",
      title: "aasen",
      translations: ["sehr", "viel"],
      wordGroup: "A",
    });
    expect(word.wordProperties).toMatchObject({
      alternativeWords: [{ alternativeWord: "aasig" }],
      berlinerisch: "aasen",
      berlinerischAudio: [
        {
          audio: { node: { mediaItemUrl: "https://cms.example/api/media/file/b.mp3" } },
          gender: "female",
        },
      ],
      berolinismus: true,
      examples: [
        {
          example: "Das war aasen.",
          exampleAudio: [
            {
              audio: { node: { mediaItemUrl: "https://cms.example/api/media/file/ex.mp3" } },
              gender: "male",
            },
          ],
        },
      ],
      infoText: "<p>Adjektiv zu Aas</p>",
      learnMore: "https://example.org/mehr",
      // only populated related words, as { id, slug, wordProperties }
      relatedWords: {
        nodes: [{ id: btoa("post:1000013"), slug: "wa", wordProperties: { berlinerisch: "wa" } }],
      },
      sources: [{ quelle: ["Meyer", "Schlobinski"] }],
    });
  });

  it("serves media captions as escaped html and descriptions rendered from rich text", async () => {
    const { toWord } = await load();
    expect(toWord(doc as never).wordProperties.images).toEqual({
      nodes: [
        {
          altText: "Küche",
          caption: "Tom &amp; Jerry",
          description: "<p>CC BY-SA</p>",
          mediaDetails: { height: 1120, width: 2000 },
          sourceUrl: "https://cms.example/api/media/file/k.png",
        },
      ],
    });
  });

  it("marks a word as an article for og:type and names the site, like Yoast did", async () => {
    const { toWord } = await load();
    expect(toWord(doc as never).seo).toMatchObject({
      opengraphSiteName: "Berliner Schnauze",
      opengraphType: "article",
    });
  });

  it("maps seo to the Yoast-shaped fields and keeps the stored derived data", async () => {
    const { toWord } = await load();
    const word = toWord(doc as never);
    expect(word.seo).toMatchObject({
      canonical: null,
      metaDesc: "Meta",
      metaRobotsNofollow: "nofollow",
      metaRobotsNoindex: "index",
      opengraphDescription: "OGD",
      opengraphImage: { sourceUrl: "https://cms.example/api/media/file/og.png" },
      opengraphTitle: "OG",
      title: "aasen",
      twitterDescription: "T",
    });
    expect(word.derived).toMatchObject({
      soundexCode: "A250",
      syllablesCount: 2,
      wordComponents: ["asen"],
    });
  });

  it("uses null for empty repeaters, like WPGraphQL did (callers test them for truthiness)", async () => {
    const { toWord } = await load();
    const { wordProperties } = toWord({
      ...doc,
      alternativeWords: [],
      berlinerischAudio: [],
      examples: [],
      sources: [],
      translations: [],
      wikimediaFiles: [],
    } as never);
    expect(wordProperties).toMatchObject({
      alternativeWords: null,
      berlinerischAudio: null,
      examples: null,
      sources: null,
      translations: null,
      wikimediaFiles: null,
    });
  });

  it("gives a word created in Payload (no berlinerWordId) a unique id outside the WordPress range", async () => {
    const { toWord } = await load();
    const [a, b] = [
      toWord({ ...doc, berlinerWordId: null, id: 7 } as never),
      toWord({ ...doc, berlinerWordId: null, id: 8 } as never),
    ];
    expect(a.berlinerWordId).toBe(1_000_007);
    expect(b.berlinerWordId).not.toBe(a.berlinerWordId);
    expect(toWord(doc as never).berlinerWordId).toBe(5703); // imported words keep theirs
  });

  it("copes with a sparse document", async () => {
    const { toWord } = await load();
    const word = toWord({
      berlinerisch: "x",
      createdAt: "",
      id: 1,
      slug: "x",
      updatedAt: "",
    } as never);
    expect(word).toMatchObject({
      berlinerWordId: 1_000_001,
      dateGmt: null,
      modifiedGmt: null,
      seo: null,
      translations: [],
    });
    expect(word.wordProperties.relatedWords).toEqual({ nodes: [] });
    expect(word.wordProperties.infoText).toBeNull();
  });
});

describe("fetchAllWords", () => {
  it("pages through the local api and asks for published words only", async () => {
    find
      .mockResolvedValueOnce(page([doc], 2))
      .mockResolvedValueOnce(page([{ ...doc, berlinerisch: "wa", id: 13, slug: "wa" }]));
    const { fetchAllWords } = await load();
    const words = await fetchAllWords();
    expect(words.map((w) => w.slug)).toEqual(["aasen", "wa"]);
    expect(find).toHaveBeenCalledTimes(2);
    expect(find.mock.calls[0][0]).toMatchObject({
      collection: "words",
      page: 1,
      where: { _status: { equals: "published" } },
    });
    expect(find.mock.calls[0][0].draft).toBeFalsy();
    expect(find.mock.calls[1][0]).toMatchObject({ page: 2 });
  });

  it("sorts by German collation (umlauts with their base letter), independent of the database locale", async () => {
    const w = (id: number, berlinerisch: string) => ({
      ...doc,
      berlinerisch,
      id,
      slug: berlinerisch.toLowerCase(),
    });
    find.mockResolvedValueOnce(
      page([w(1, "Bulette"), w(2, "Ärger"), w(3, "aasen"), w(4, "Zille")]),
    );
    const { fetchAllWords } = await load();
    expect((await fetchAllWords()).map((x) => x.wordProperties.berlinerisch)).toEqual([
      "aasen",
      "Ärger",
      "Bulette",
      "Zille",
    ]);
  });

  it("includes drafts when SHOW_TEST_DATA is on", async () => {
    vi.doMock("astro:env/client", () => ({ SHOW_TEST_DATA: true }));
    find.mockResolvedValueOnce(page([doc]));
    const { fetchAllWords } = await load();
    await fetchAllWords();
    const args = find.mock.calls[0][0];
    expect(args.draft).toBe(true);
    expect(args.where).toBeUndefined();
  });

  it("drops words without a slug with a warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    find.mockResolvedValueOnce(page([doc, { ...doc, id: 99, slug: null }]));
    const { fetchAllWords } = await load();
    expect((await fetchAllWords()).map((w) => w.slug)).toEqual(["aasen"]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("caches for a minute, then reloads, and never caches a failure", async () => {
    vi.useFakeTimers();
    find.mockRejectedValueOnce(new Error("db down")).mockResolvedValue(page([doc]));
    const { fetchAllWords } = await load();
    await expect(fetchAllWords()).rejects.toThrow("db down");
    await fetchAllWords();
    await fetchAllWords();
    expect(find).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(61_000);
    await fetchAllWords();
    expect(find).toHaveBeenCalledTimes(3);
  });
});
