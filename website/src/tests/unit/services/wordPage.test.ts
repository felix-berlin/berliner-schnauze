import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  fetchAffiliateData: vi.fn(),
  fetchAllWords: vi.fn(),
  fetchStories: vi.fn(),
  fetchWordPageGlobal: vi.fn(),
  find: vi.fn(),
  getWordTrend: vi.fn(),
  pick: vi.fn(),
}));
vi.mock("@services/payload.ts", () => ({ getPayloadClient: async () => ({ find: m.find }) }));
vi.mock("@services/payload/words.ts", () => ({
  fetchAllWords: m.fetchAllWords,
  fetchWordBySlug: async (slug: string) =>
    ((await m.fetchAllWords()) as { slug: string }[]).find((w) => w.slug === slug),
}));
vi.mock("@services/payload/stories.ts", () => ({ fetchStories: m.fetchStories }));
vi.mock("@services/payload/wordTrend.ts", () => ({ getWordTrend: m.getWordTrend }));
vi.mock("@services/payload/site.ts", () => ({
  fetchAffiliateData: m.fetchAffiliateData,
  fetchWordPageGlobal: m.fetchWordPageGlobal,
}));
vi.mock("@utils/wordOfTheDay.ts", async (orig) => ({
  ...(await orig<object>()),
  pickWordOfTheDay: m.pick,
}));

import { fetchWordPage } from "@services/payload/wordPage.ts";

// Invented words, alphabetical: aaa, bbb, ccc
const word = (id: number, berlinerisch: string, extra: object = {}) => ({
  berlinerisch,
  id,
  slug: berlinerisch,
  themen: [],
  updatedAt: "2026-11-01T10:00:00.000Z",
  ...extra,
});

const words = (bbb: object = {}) => [word(1, "aaa"), word(2, "bbb", bbb), word(3, "ccc")];

beforeEach(() => {
  vi.resetAllMocks();
  m.fetchAffiliateData.mockResolvedValue({ books: [], disclaimers: [] });
  m.fetchStories.mockResolvedValue({
    featured: null,
    hasMore: false,
    items: [],
    page: 1,
    total: 0,
  });
  m.fetchWordPageGlobal.mockResolvedValue({ storyPrompt: null });
  m.find.mockResolvedValue({ docs: [] });
});

describe("fetchWordPage", () => {
  it("is null for an unknown slug", async () => {
    m.fetchAllWords.mockResolvedValue(words());
    expect(await fetchWordPage("nope")).toBeNull();
  });

  it("gives empty arrays and no trend, wotd or book for a word without optional data", async () => {
    m.fetchAllWords.mockResolvedValue(words());
    const model = (await fetchWordPage("bbb"))!;
    expect(model).toMatchObject({
      facts: [],
      grammar: {},
      related: [],
      stories: { items: [], total: 0 },
    });
    expect(model).not.toHaveProperty("trend");
    expect(model).not.toHaveProperty("wotd");
    expect(model).not.toHaveProperty("book");
    expect(model.poll.total).toBe(0);
  });

  it("links the alphabetical neighbours", async () => {
    m.fetchAllWords.mockResolvedValue(words());
    const model = (await fetchWordPage("bbb"))!;
    expect(model.before).toEqual({ label: "aaa", url: "/wort/aaa" });
    expect(model.after).toEqual({ label: "ccc", url: "/wort/ccc" });
    expect((await fetchWordPage("aaa"))!.before).toBeUndefined();
  });

  it("keeps all five related entries and maps contributors", async () => {
    const related = Array.from({ length: 5 }, (_, i) => ({
      contributorName: i === 0 ? "Invented Name" : null,
      contributorSuggestion: i === 0 ? 77 : undefined,
      label: `free ${i}`,
      relation: "verwandt",
      word: i === 1 ? { berlinerisch: "aaa", id: 1, slug: "aaa" } : undefined,
    }));
    m.fetchAllWords.mockResolvedValue(words({ related }));
    const model = (await fetchWordPage("bbb"))!;
    expect(model.related).toHaveLength(5);
    expect(model.related[0]).toMatchObject({
      contributor: { name: "Invented Name", suggestionId: "77" },
    });
    expect(model.related[1]).toMatchObject({ label: "aaa", url: "/wort/aaa" });
    expect(model.related[2]).not.toHaveProperty("url");
  });

  it("keeps facts with a kind and an html, drops the others, and maps source and contributor", async () => {
    const facts = [
      {
        contributorName: "Invented Name",
        contributorSuggestion: 5,
        html: "<p>A &lt;b&gt;</p>",
        kind: "herkunft",
        source: "Invented Book",
      },
      { html: "<p>B</p>", kind: "etymologie" },
      { html: "", kind: "herkunft" },
      { html: "<p>no kind</p>" },
    ];
    m.fetchAllWords.mockResolvedValue(words({ facts }));
    expect((await fetchWordPage("bbb"))!.facts).toEqual([
      {
        contributor: { name: "Invented Name", suggestionId: "5" },
        html: "<p>A &lt;b&gt;</p>",
        kind: "herkunft",
        source: "Invented Book",
      },
      { html: "<p>B</p>", kind: "etymologie" },
    ]);
  });

  it("drops a related entry with neither a label nor a linked word", async () => {
    m.fetchAllWords.mockResolvedValue(
      words({
        related: [
          { label: "", relation: "verwandt" },
          { relation: "gleich" },
          { label: "only text" },
        ],
      }),
    );
    expect((await fetchWordPage("bbb"))!.related.map((r) => r.label)).toEqual(["only text"]);
  });

  it("nests the further books in `book`, and has none without a picked book", async () => {
    const themen = [{ id: 9, name: "Essen", slug: "essen" }];
    m.fetchAllWords.mockResolvedValue(words({ themen }));
    m.fetchAffiliateData.mockResolvedValue({
      books: [
        { href: "https://shop.example/y", themen: [9], title: "Y" },
        {
          description: "Note",
          href: "https://shop.example/z",
          imageUrl: "https://i.example/z",
          title: "Z",
        },
      ],
      disclaimers: [],
    });
    expect((await fetchWordPage("bbb"))!.book?.more).toEqual([
      { cover: "https://i.example/z", note: "Note", title: "Z", url: "https://shop.example/z" },
    ]);
    const model = (await fetchWordPage("aaa"))!;
    expect(model).not.toHaveProperty("book");
    expect(model).not.toHaveProperty("moreBooks");
  });

  describe("a failing optional source does not fail the page", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      m.fetchAllWords.mockResolvedValue(words());
    });

    it("a failing poll query: empty poll, rest of the page intact", async () => {
      // Its own id: the poll is cached per word for a minute.
      m.fetchAllWords.mockResolvedValue([word(61, "ppp")]);
      m.find.mockRejectedValue(new Error("db down"));
      const model = (await fetchWordPage("ppp"))!;
      expect(model.poll.total).toBe(0);
      expect(model.word.id).toBe(61);
      expect(console.error).toHaveBeenCalledWith("[word page poll] failed: Error");
    });

    it("failing stories: no stories, no featured", async () => {
      m.fetchStories.mockRejectedValue(new Error("db down"));
      const model = (await fetchWordPage("bbb"))!;
      expect(model.stories).toEqual({ items: [], total: 0 });
      expect(model).not.toHaveProperty("featured");
    });

    it("failing affiliate and global: no book, default story prompt", async () => {
      m.fetchAffiliateData.mockRejectedValue(new Error("x"));
      m.fetchWordPageGlobal.mockRejectedValue(new Error("x"));
      const model = (await fetchWordPage("bbb"))!;
      expect(model).not.toHaveProperty("book");
      expect(model.storyPrompt).toBe("Wo haste „bbb“ zuletzt jehört?");
    });

    it("a failing trend only drops the trend", async () => {
      m.getWordTrend.mockRejectedValue(new Error("x"));
      expect(await fetchWordPage("bbb")).not.toHaveProperty("trend");
    });

    it("the word itself still throws", async () => {
      m.fetchAllWords.mockRejectedValue(new Error("db down"));
      await expect(fetchWordPage("bbb")).rejects.toThrow("db down");
    });
  });

  it("lists similarly written words, the most similar first", async () => {
    m.fetchAllWords.mockResolvedValue([
      word(1, "schnauzen"),
      word(2, "schnauze"),
      word(3, "schnauzer"),
      word(4, "kiez"),
    ]);
    const { written } = (await fetchWordPage("schnauze"))!;
    expect(written.map((w) => w.label).sort()).toEqual(["schnauzen", "schnauzer"]);
  });

  it("builds the model from an editor's draft instead of the public row", async () => {
    m.fetchAllWords.mockResolvedValue(words());
    const draft = { ...(words().find((w) => w.slug === "bbb") as object), berlinerisch: "Entwurf" };
    const model = (await fetchWordPage("bbb", draft as never))!;
    expect(model.word.berlinerisch).toBe("Entwurf");
  });

  it("passes updatedAt through unchanged", async () => {
    m.fetchAllWords.mockResolvedValue(words({ updatedAt: "2026-02-03T04:05:06.789Z" }));
    expect((await fetchWordPage("bbb"))!.updatedAt).toBe("2026-02-03T04:05:06.789Z");
  });

  it("maps the weekly top 10 to a trend with rank and weekly views only", async () => {
    m.fetchAllWords.mockResolvedValue(words());
    m.getWordTrend.mockResolvedValue({
      bars: [0, 0, 0, 0, 0, 0, 4],
      change: null,
      rank: 3,
      views: 40,
    });
    expect((await fetchWordPage("bbb"))!.trend).toEqual({
      rank: 3,
      views7: 40,
    });
    expect(m.getWordTrend).toHaveBeenCalledWith(2);
  });

  it("does not look up the trend of a draft", async () => {
    m.fetchAllWords.mockResolvedValue(words());
    m.getWordTrend.mockClear();
    m.getWordTrend.mockResolvedValue({ bars: [], change: 1, rank: 1, views: 9 });
    const draft = words().find((w) => w.slug === "bbb");
    const model = (await fetchWordPage("bbb", draft as never))!;
    expect(model).not.toHaveProperty("trend");
    expect(m.getWordTrend).not.toHaveBeenCalled();
  });

  it("sets wotd only when the word is today's pick", async () => {
    m.fetchAllWords.mockResolvedValue(words());
    m.pick.mockReturnValue(word(2, "bbb"));
    expect((await fetchWordPage("bbb"))!.wotd).toEqual({
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    expect(await fetchWordPage("ccc")).not.toHaveProperty("wotd");
  });

  it("picks the book of the first Thema, none without a match", async () => {
    const themen = [{ id: 9, name: "Essen", slug: "essen" }];
    m.fetchAllWords.mockResolvedValue(words({ themen }));
    m.fetchAffiliateData.mockResolvedValue({
      books: [
        { href: "https://shop.example/x", themen: [1], title: "X" },
        {
          href: "https://shop.example/y",
          imageUrl: "https://img.example/y.jpg",
          themen: [9],
          title: "Y",
        },
      ],
      disclaimers: [],
    });
    expect((await fetchWordPage("bbb"))!.book).toEqual({
      cover: "https://img.example/y.jpg",
      more: [{ title: "X", url: "https://shop.example/x" }],
      title: "Y",
      url: "https://shop.example/y",
    });
    expect(await fetchWordPage("aaa")).not.toHaveProperty("book");
  });

  it("skips a book with a javascript: link and carries the CMS disclaimer of the platform", async () => {
    const themen = [{ id: 9, name: "Essen", slug: "essen" }];
    m.fetchAllWords.mockResolvedValue(words({ themen }));
    m.fetchAffiliateData.mockResolvedValue({
      books: [
        { href: "javascript:alert(1)", themen: [9], title: "Bad" },
        { href: "https://www.amazon.de/dp/X", themen: [9], title: "Good" },
      ],
      disclaimers: [{ plattform: "Amazon", text: "CMS Amazon." }],
    });
    expect((await fetchWordPage("bbb"))!.book).toEqual({
      disclosure: "CMS Amazon.",
      more: [],
      title: "Good",
      url: "https://www.amazon.de/dp/X",
    });
  });

  it("fills the story prompt (default or template) and carries the Jeschichten", async () => {
    m.fetchAllWords.mockResolvedValue(words());
    const story = {
      anders: 0,
      createdAt: "2026-11-01T10:00:00.000Z",
      id: "5",
      jenau: 2,
      text: "Invented.",
    };
    m.fetchStories.mockResolvedValue({
      featured: story,
      hasMore: false,
      items: [{ ...story, id: "6" }],
      page: 1,
      total: 4,
    });
    const model = (await fetchWordPage("bbb"))!;
    expect(model.storyPrompt).toBe("Wo haste „bbb“ zuletzt jehört?");
    expect(model.stories).toEqual({ items: [{ ...story, id: "6" }], total: 4 });
    expect(model).not.toHaveProperty("featuredStoryId");
    expect(model.featured).toEqual(story);
    expect(m.fetchStories).toHaveBeenCalledWith(2, 1);
    m.fetchWordPageGlobal.mockResolvedValue({ storyPrompt: "Kennste {Wort}?" });
    expect((await fetchWordPage("bbb"))!.storyPrompt).toBe("Kennste bbb?");
  });

  it("builds the poll result once per word within the TTL", async () => {
    const all = [word(50, "ddd")];
    m.fetchAllWords.mockResolvedValue(all);
    await fetchWordPage("ddd");
    await fetchWordPage("ddd");
    expect(m.find).toHaveBeenCalledTimes(1);
  });
});
