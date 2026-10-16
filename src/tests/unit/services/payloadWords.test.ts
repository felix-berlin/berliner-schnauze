import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getPayload, find } = vi.hoisted(() => ({ getPayload: vi.fn(), find: vi.fn() }));
vi.mock("payload-app", () => ({ config: Promise.resolve({}), getPayload }));
vi.mock("astro:env/server", () => ({ PAYLOAD_SERVER_URL: "https://cms.example" }));
vi.mock("astro:env/client", () => ({ SHOW_TEST_DATA: false }));

const lexical = (value: string) => ({
  root: { type: "root", direction: "ltr", format: "", indent: 0, version: 1, children: [{ type: "paragraph", direction: "ltr", format: "", indent: 0, version: 1, textFormat: 0, children: [{ type: "text", text: value, format: 0, detail: 0, mode: "normal", style: "", version: 1 }] }] },
});

const doc = {
  id: 12,
  berlinerisch: "aasen",
  slug: "aasen",
  berlinerWordId: 5703,
  article: null,
  translations: [{ translation: "sehr" }, { translation: "" }, { translation: null }, { translation: "viel" }],
  alternativeWords: [{ alternativeWord: "aasig" }],
  examples: [{ example: "Das war aasen.", exampleExplanation: "Erklärung", exampleAudio: [{ gender: "male", audio: { id: 1, url: "/api/media/file/ex.mp3" } }] }],
  berlinerischAudio: [{ gender: "female", audio: { id: 4, url: "/api/media/file/b.mp3" } }],
  relatedWords: [{ id: 13, slug: "wa", berlinerisch: "wa" }, 14],
  wikimediaFiles: [{ wikimediaFile: "File:A.jpg", description: "d", caption: "c" }],
  infoText: lexical("Adjektiv zu Aas"),
  learnMore: "https://example.org/mehr",
  berolinismus: true,
  sources: ["Meyer", "Schlobinski"],
  images: [{ id: 2, url: "/api/media/file/k.png", alt: "Küche", caption: "Tom & Jerry", description: lexical("CC BY-SA"), width: 2000, height: 1120 }, 5],
  wordTypes: [{ id: 1, name: "Adjektiv" }],
  themen: [{ id: 2, name: "Essen", slug: "essen" }],
  publishedAt: "2025-04-09T08:12:37.000Z",
  contentModifiedAt: "2026-09-20T17:24:19.000Z",
  seo: { title: "aasen", description: "Meta", canonical: null, ogTitle: "OG", ogDescription: "OGD", ogImage: { id: 9, url: "/api/media/file/og.png" }, twitterTitle: null, twitterDescription: "T", noindex: false, nofollow: true },
  derived: { wordGroup: "A", characterLength: 5, syllablesCount: 2, consonantsCount: 2, vowelsCount: 3, nlpTags: [], wordComponents: ["asen"], soundexCode: "A250" },
  updatedAt: "2026-10-01T00:00:00.000Z",
  createdAt: "2026-10-01T00:00:00.000Z",
  _status: "published",
};

const page = (docs: unknown[], nextPage: number | null = null) => ({ docs, hasNextPage: nextPage !== null, nextPage });

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
      id: "12",
      slug: "aasen",
      title: "aasen",
      wordGroup: "A",
      berlinerWordId: 5703,
      // WP format: no milliseconds, no trailing Z (callers append "Z" themselves)
      dateGmt: "2025-04-09T08:12:37",
      modifiedGmt: "2026-09-20T17:24:19",
      translations: ["sehr", "viel"],
      berlinerischWordTypes: { nodes: [{ name: "Adjektiv" }] },
      berlinerischThemen: { nodes: [{ name: "Essen", slug: "essen" }] },
    });
    expect(word.wordProperties).toMatchObject({
      berlinerisch: "aasen",
      berolinismus: true,
      learnMore: "https://example.org/mehr",
      infoText: "<p>Adjektiv zu Aas</p>",
      sources: [{ quelle: ["Meyer", "Schlobinski"] }],
      alternativeWords: [{ alternativeWord: "aasig" }],
      // only populated related words, as { id, slug, wordProperties }
      relatedWords: { nodes: [{ id: "13", slug: "wa", wordProperties: { berlinerisch: "wa" } }] },
      berlinerischAudio: [{ gender: "female", audio: { node: { mediaItemUrl: "https://cms.example/api/media/file/b.mp3" } } }],
      examples: [{ example: "Das war aasen.", exampleAudio: [{ gender: "male", audio: { node: { mediaItemUrl: "https://cms.example/api/media/file/ex.mp3" } } }] }],
    });
  });

  it("serves media captions as escaped html and descriptions rendered from rich text", async () => {
    const { toWord } = await load();
    expect(toWord(doc as never).wordProperties.images).toEqual({
      nodes: [{ sourceUrl: "https://cms.example/api/media/file/k.png", altText: "Küche", caption: "Tom &amp; Jerry", description: "<p>CC BY-SA</p>", mediaDetails: { height: 1120, width: 2000 } }],
    });
  });

  it("maps seo to the Yoast-shaped fields and keeps the stored derived data", async () => {
    const { toWord } = await load();
    const word = toWord(doc as never);
    expect(word.seo).toMatchObject({
      title: "aasen",
      metaDesc: "Meta",
      canonical: null,
      opengraphTitle: "OG",
      opengraphDescription: "OGD",
      opengraphImage: { sourceUrl: "https://cms.example/api/media/file/og.png" },
      twitterDescription: "T",
      metaRobotsNoindex: "index",
      metaRobotsNofollow: "nofollow",
    });
    expect(word.derived).toMatchObject({ syllablesCount: 2, soundexCode: "A250", wordComponents: ["asen"] });
  });

  it("copes with a sparse document", async () => {
    const { toWord } = await load();
    const word = toWord({ id: 1, berlinerisch: "x", slug: "x", updatedAt: "", createdAt: "" } as never);
    expect(word).toMatchObject({ translations: [], dateGmt: null, modifiedGmt: null, berlinerWordId: 0, seo: null });
    expect(word.wordProperties.relatedWords).toEqual({ nodes: [] });
    expect(word.wordProperties.infoText).toBeNull();
  });
});

describe("fetchAllWords", () => {
  it("pages through the local api and asks for published words only", async () => {
    find.mockResolvedValueOnce(page([doc], 2)).mockResolvedValueOnce(page([{ ...doc, id: 13, slug: "wa", berlinerisch: "wa" }]));
    const { fetchAllWords } = await load();
    const words = await fetchAllWords();
    expect(words.map((w) => w.slug)).toEqual(["aasen", "wa"]);
    expect(find).toHaveBeenCalledTimes(2);
    expect(find.mock.calls[0][0]).toMatchObject({ collection: "words", where: { _status: { equals: "published" } }, page: 1 });
    expect(find.mock.calls[0][0].draft).toBeFalsy();
    expect(find.mock.calls[1][0]).toMatchObject({ page: 2 });
  });

  it("sorts by German collation (umlauts with their base letter), independent of the database locale", async () => {
    const w = (id: number, berlinerisch: string) => ({ ...doc, id, slug: berlinerisch.toLowerCase(), berlinerisch });
    find.mockResolvedValueOnce(page([w(1, "Bulette"), w(2, "Ärger"), w(3, "aasen"), w(4, "Zille")]));
    const { fetchAllWords } = await load();
    expect((await fetchAllWords()).map((x) => x.wordProperties.berlinerisch)).toEqual(["aasen", "Ärger", "Bulette", "Zille"]);
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
