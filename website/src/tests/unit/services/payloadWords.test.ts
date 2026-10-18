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
    title: "aasen",
  },
  publishedAt: "2025-04-09T08:12:37.000Z",
  relatedWords: [
    { berlinerisch: "wa", id: 13, slug: "wa" },
    { berlinerisch: "ohne slug", id: 15, slug: null },
    // not readable as the site (siteRead): left unpopulated
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
  it("keeps the payload doc and populates what the pages read", async () => {
    const { toWord } = await load();
    const word = toWord(doc as never);
    expect(word).toMatchObject({
      alternativeWords: [{ alternativeWord: "aasig" }],
      berlinerisch: "aasen",
      berolinismus: true,
      contentModifiedAt: "2026-09-20T17:24:19.000Z",
      derived: { soundexCode: "A250", syllablesCount: 2, wordComponents: ["asen"] },
      infoTextHtml: "<p>Adjektiv zu Aas</p>",
      learnMore: "https://example.org/mehr",
      meta: { description: "Meta", title: "aasen" },
      publishedAt: "2025-04-09T08:12:37.000Z",
      slug: "aasen",
      sources: ["Meyer", "Schlobinski"],
      themen: [{ id: 2, name: "Essen", slug: "essen" }],
      wordTypes: [{ id: 1, name: "Adjektiv" }],
    });
    // the raw rich text is not kept: the html above is what the pages render
    expect(word).not.toHaveProperty("infoText");
  });

  it("narrows audio rows to media with absolute urls", async () => {
    const { toWord } = await load();
    const word = toWord(doc as never);
    expect(word.berlinerischAudio).toEqual([
      expect.objectContaining({
        audio: expect.objectContaining({ url: "https://cms.example/api/media/file/b.mp3" }),
        gender: "female",
      }),
    ]);
    expect(word.examples[0]).toMatchObject({
      example: "Das war aasen.",
      exampleAudio: [
        { audio: { url: "https://cms.example/api/media/file/ex.mp3" }, gender: "male" },
      ],
      exampleExplanation: "Erklärung",
    });
  });

  it("keeps populated images as media with an absolute url and the description as html", async () => {
    const { toWord } = await load();
    expect(toWord(doc as never).images).toEqual([
      {
        alt: "Küche",
        // plain text: the component escapes it
        caption: "Tom & Jerry",
        descriptionHtml: "<p>CC BY-SA</p>",
        height: 1120,
        id: 2,
        mimeType: undefined,
        url: "https://cms.example/api/media/file/k.png",
        width: 2000,
      },
    ]);
  });

  it("keeps the populated related words that have a slug", async () => {
    const { toWord } = await load();
    expect(toWord(doc as never).relatedWords).toEqual([{ berlinerisch: "wa", id: 13, slug: "wa" }]);
  });

  it("computes the derived fields, with a warning, when the stored group is unset (Payload: an object of nulls)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { toWord } = await load();
    const word = toWord({
      ...doc,
      berlinerisch: "wat",
      derived: { characterLength: null, wordGroup: null },
    } as never);
    expect(word.derived).toMatchObject({ characterLength: 3, wordGroup: "W" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("aasen"));
    warn.mockRestore();
  });

  it("leaves the word group empty for a headword without a leading letter", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { toWord } = await load();
    expect(
      toWord({ ...doc, berlinerisch: "1a", derived: { wordGroup: null } } as never).derived
        .wordGroup,
    ).toBe("");
    warn.mockRestore();
  });

  it("copes with a sparse document: repeaters and relations become empty arrays", async () => {
    const { toWord } = await load();
    const word = toWord({
      berlinerisch: "x",
      createdAt: "",
      id: 1,
      slug: "x",
      updatedAt: "",
    } as never);
    expect(word).toMatchObject({
      berlinerischAudio: [],
      examples: [],
      images: [],
      infoTextHtml: null,
      relatedWords: [],
      themen: [],
      wordTypes: [],
    });
  });
});

describe("translationTexts", () => {
  it("returns the non-empty translations as strings", async () => {
    const { translationTexts } = await load();
    expect(translationTexts(doc as never)).toEqual(["sehr", "viel"]);
    expect(translationTexts({ translations: null } as never)).toEqual([]);
  });
});

describe("metaToSeo", () => {
  it("maps the plugin meta group to the BaseHead props, marks og:type and names the site", async () => {
    const { metaToSeo } = await import("@services/payload/seo.ts");
    expect(metaToSeo(doc.meta as never, "article")).toEqual({
      metaDesc: "Meta",
      opengraphDescription: "Meta",
      opengraphImage: { sourceUrl: "https://cms.example/api/media/file/og.png" },
      opengraphSiteName: "Berliner Schnauze",
      opengraphType: "article",
      robots: "nofollow",
      title: "aasen",
    });
    expect(metaToSeo(null)).toEqual({});
  });

  it("turns the robots flags into a robots value, and leaves it out when neither is set", async () => {
    const { metaToSeo } = await import("@services/payload/seo.ts");
    expect(metaToSeo({ nofollow: true, noindex: true } as never).robots).toBe("noindex, nofollow");
    expect(metaToSeo({ nofollow: true } as never).robots).toBe("nofollow");
    expect(metaToSeo({ noindex: false } as never)).not.toHaveProperty("robots");
  });
});

describe("fetchAllWords", () => {
  // The change check (latest updatedAt per collection) answers `probe`; the word pages go to `loadPages`.
  const loadPages = vi.fn();
  let probe: { docs: { updatedAt: string }[]; totalDocs: number };
  beforeEach(() => {
    probe = { docs: [{ updatedAt: "2026-10-01T00:00:00.000Z" }], totalDocs: 1 };
    loadPages.mockReset();
    find.mockImplementation((args: { sort?: string }) =>
      args.sort === "-updatedAt" ? Promise.resolve(probe) : loadPages(args),
    );
  });

  it("pages through the local api and asks for published words only", async () => {
    loadPages
      .mockResolvedValueOnce(page([doc], 2))
      .mockResolvedValueOnce(page([{ ...doc, berlinerisch: "wa", id: 13, slug: "wa" }]));
    const { fetchAllWords } = await load();
    const words = await fetchAllWords();
    expect(words.map((w) => w.slug)).toEqual(["aasen", "wa"]);
    expect(loadPages).toHaveBeenCalledTimes(2);
    expect(loadPages.mock.calls[0][0]).toMatchObject({
      collection: "words",
      context: { siteRead: "published" },
      overrideAccess: false,
      page: 1,
    });
    expect(loadPages.mock.calls[0][0].draft).toBeFalsy();
    expect(loadPages.mock.calls[1][0]).toMatchObject({ page: 2 });
  });

  it("sorts by German collation (umlauts with their base letter), independent of the database locale", async () => {
    const w = (id: number, berlinerisch: string) => ({
      ...doc,
      berlinerisch,
      id,
      slug: berlinerisch.toLowerCase(),
    });
    loadPages.mockResolvedValueOnce(
      page([w(1, "Bulette"), w(2, "Ärger"), w(3, "aasen"), w(4, "Zille")]),
    );
    const { fetchAllWords } = await load();
    expect((await fetchAllWords()).map((x) => x.berlinerisch)).toEqual([
      "aasen",
      "Ärger",
      "Bulette",
      "Zille",
    ]);
  });

  it("includes drafts when SHOW_TEST_DATA is on", async () => {
    vi.doMock("astro:env/client", () => ({ SHOW_TEST_DATA: true }));
    loadPages.mockResolvedValueOnce(page([doc]));
    const { fetchAllWords } = await load();
    await fetchAllWords();
    const args = loadPages.mock.calls[0][0];
    expect(args.draft).toBe(true);
    expect(args.where).toBeUndefined();
  });

  it("drops words without a slug, and drafts without a headword, with a warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    loadPages.mockResolvedValueOnce(
      page([doc, { ...doc, id: 99, slug: null }, { ...doc, berlinerisch: undefined, id: 98 }]),
    );
    const { fetchAllWords } = await load();
    expect((await fetchAllWords()).map((w) => w.slug)).toEqual(["aasen"]);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("populates relations with only the fields the site reads", async () => {
    loadPages.mockResolvedValueOnce(page([doc]));
    const { fetchAllWords } = await load();
    await fetchAllWords();
    expect(loadPages.mock.calls[0][0]).toMatchObject({
      depth: 1,
      populate: {
        themen: { name: true, slug: true },
        "word-types": { name: true },
        words: { berlinerisch: true, slug: true },
      },
    });
  });

  it("caches for a minute, then reloads only when something changed, and never caches a failure", async () => {
    vi.useFakeTimers();
    loadPages.mockRejectedValueOnce(new Error("db down")).mockResolvedValue(page([doc]));
    const { fetchAllWords } = await load();
    await expect(fetchAllWords()).rejects.toThrow("db down");
    const first = await fetchAllWords();
    await fetchAllWords();
    expect(loadPages).toHaveBeenCalledTimes(2);

    // a minute later, nothing changed: the same array, no reload
    vi.advanceTimersByTime(61_000);
    await fetchAllWords();
    await vi.runAllTimersAsync();
    expect(loadPages).toHaveBeenCalledTimes(2);
    expect(await fetchAllWords()).toBe(first);

    // a word changed: the next refresh reloads
    probe = { ...probe, docs: [{ updatedAt: "2026-10-02T00:00:00.000Z" }] };
    vi.advanceTimersByTime(61_000);
    await fetchAllWords();
    await vi.runAllTimersAsync();
    expect(loadPages).toHaveBeenCalledTimes(3);
    expect(await fetchAllWords()).not.toBe(first);
  });

  it("checks the public word count and the populated collections for changes", async () => {
    vi.doMock("astro:env/client", () => ({ SHOW_TEST_DATA: false }));
    loadPages.mockResolvedValueOnce(page([doc]));
    const { fetchAllWords } = await load();
    await fetchAllWords();
    const probed = find.mock.calls
      .map(([args]) => args)
      .filter((args) => args.sort === "-updatedAt");
    expect(probed.map((args) => args.collection)).toEqual([
      "words",
      "media",
      "themen",
      "word-types",
    ]);
    for (const args of probed)
      expect(args).toMatchObject({ context: { siteRead: "published" }, overrideAccess: false });
  });
});

describe("fetchDraftWord", () => {
  it("shows the published version of related words, as the public page does", async () => {
    const findByID = vi.fn().mockResolvedValue({
      ...doc,
      _status: "draft",
      // draft: true populated the latest versions: 13 has a newer draft, 14 was never published
      relatedWords: [
        { _status: "draft", berlinerisch: "wa (neu)", id: 13, slug: "wa" },
        { _status: "draft", berlinerisch: "geheim", id: 14, slug: "geheim" },
      ],
    });
    getPayload.mockResolvedValue({ find, findByID });
    find.mockResolvedValue({
      docs: [{ _status: "published", berlinerisch: "wa", id: 13, slug: "wa" }],
    });
    const { fetchDraftWord } = await load();
    const word = await fetchDraftWord(1);
    expect(word?.relatedWords).toEqual([{ berlinerisch: "wa", id: 13, slug: "wa" }]);
    expect(find.mock.calls[0][0]).toMatchObject({
      context: { siteRead: "published" },
      overrideAccess: false,
      where: { id: { in: [13, 14] } },
    });
  });

  it("is undefined for a missing doc", async () => {
    getPayload.mockResolvedValue({ find, findByID: vi.fn().mockResolvedValue(null) });
    const { fetchDraftWord } = await load();
    expect(await fetchDraftWord(1)).toBeUndefined();
    expect(find).not.toHaveBeenCalled();
  });
});
