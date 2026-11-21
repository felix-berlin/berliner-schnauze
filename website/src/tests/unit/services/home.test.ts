import { beforeEach, describe, expect, it, vi } from "vitest";

const { count, fetchAllPosts, fetchAllThemen, fetchAllWords, fetchHomeGlobal } = vi.hoisted(() => ({
  count: vi.fn(),
  fetchAllPosts: vi.fn(),
  fetchAllThemen: vi.fn(),
  fetchAllWords: vi.fn(),
  fetchHomeGlobal: vi.fn(),
}));
vi.mock("astro:env/server", () => ({ PAYLOAD_SERVER_URL: "https://cms.example" }));
vi.mock("astro:env/client", () => ({ SHOW_TEST_DATA: false }));
vi.mock("payload-app", () => ({ config: Promise.resolve({}), getPayload: vi.fn() }));
vi.mock("@services/payload.ts", () => ({
  getPayloadClient: async () => ({ count }),
}));
vi.mock("@services/payload/words.ts", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchAllWords,
}));
vi.mock("@services/payload/themen.ts", () => ({ fetchAllThemen }));
vi.mock("@services/payload/posts.ts", () => ({ fetchAllPosts }));
vi.mock("@services/payload/site.ts", () => ({ fetchHomeGlobal }));
// A rich text with `boom` stands for html the converter cannot render.
vi.mock("payload-app/lexical-html", () => ({
  lexicalToHtml: (state: { boom?: boolean; text: string }) => {
    if (state.boom) throw new Error("bad lexical");
    return `<p>${state.text}</p>`;
  },
}));

const word = (slug: string, over: Record<string, unknown> = {}) => ({
  article: null,
  berlinerisch: slug,
  berlinerischAudio: [],
  examples: [],
  id: slug.length,
  ipa: null,
  publishedAt: "2026-01-01T00:00:00.000Z",
  slug,
  themen: [],
  translations: [{ translation: `${slug} bedeutet` }],
  wordTypes: [],
  ...over,
});

const audio = { audio: { url: "https://cms.example/a.mp3" }, gender: "male" };

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ now: new Date("2026-11-21T12:00:00Z"), toFake: ["Date"] });
  count.mockReset().mockResolvedValue({ totalDocs: 7 });
  fetchAllPosts.mockReset().mockResolvedValue([]);
  fetchAllThemen.mockReset().mockResolvedValue([]);
  fetchAllWords.mockReset().mockResolvedValue([]);
  fetchHomeGlobal.mockReset().mockResolvedValue({});
});

const load = async () => (await import("@services/payload/home.ts")).fetchHome();

describe("fetchHome", () => {
  it("returns safe empty values for an empty global and no words", async () => {
    const home = await load();
    expect(home).toMatchObject({
      about: { counts: { audio: 0, topics: 0, votes: 7 } },
      browseLinks: [],
      faq: [],
      gap: { wordsWithoutAudio: 0 },
      magazine: null,
      newest: [],
      poll: null,
      soundRules: [],
      topics: [],
      tryWords: [],
      word: null,
      wordCount: 0,
    });
  });

  it("builds the word of the day, the poll word and the gap from three words", async () => {
    fetchAllWords.mockResolvedValue([
      word("aasen", { article: "der", berlinerischAudio: [audio], ipa: "ˈaːzn̩" }),
      word("bolle", {
        examples: [{ example: "Ick hab ne Bolle.", exampleExplanation: "Ich habe eine Zwiebel." }],
        wordTypes: [{ id: 1, name: "Nomen" }],
      }),
      word("kiez"),
    ]);
    const home = await load();
    expect(home.wordCount).toBe(3);
    expect(home.word).not.toBeNull();
    expect(home.word!.morse.length).toBeGreaterThanOrEqual(1);
    expect(home.word!.morse.length).toBeLessThanOrEqual(28);
    expect(home.word!.dateLabel).toBe("Samstag, 21. November");
    expect(home.poll).toMatchObject({ totalVotes: 7 });
    expect(home.poll!.slug).not.toBe(home.word!.slug);
    expect(home.gap.wordsWithoutAudio).toBe(2);
    expect(home.about.counts).toMatchObject({ audio: 1, votes: 7 });
  });

  it("maps optional word fields and omits missing audio and ipa", async () => {
    fetchAllWords.mockResolvedValue([
      word("aasen", { berlinerischAudio: [audio], ipa: "ˈaːzn̩" }),
      word("kiez"),
    ]);
    // consecutive days alternate between the two words, so both appear as the word of the day
    const days = ["2026-11-21T12:00:00Z", "2026-11-22T12:00:00Z"];
    const words = [];
    for (const day of days) {
      vi.setSystemTime(new Date(day));
      vi.resetModules();
      // oxlint-disable-next-line no-await-in-loop -- the two days must load one after the other
      words.push((await load()).word!);
    }
    const full = words.find((w) => w.slug === "aasen");
    const plain = words.find((w) => w.slug === "kiez");
    expect(full).toMatchObject({ audioUrl: "https://cms.example/a.mp3", ipa: "ˈaːzn̩" });
    expect(plain).not.toHaveProperty("ipa");
    expect(plain).not.toHaveProperty("audioUrl");
  });

  it("lists the 5 newest published words by publishedAt descending", async () => {
    fetchAllWords.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) =>
        word(`wort${i}`, { publishedAt: `2026-0${i + 1}-01T00:00:00.000Z` }),
      ),
    );
    const { newest } = await load();
    expect(newest.map((n) => n.slug)).toEqual(["wort6", "wort5", "wort4", "wort3", "wort2"]);
  });

  it("returns the top 6 topics by count with examples and the saying", async () => {
    const ws = [
      word("a", { themen: [{ id: 1, name: "Essen", slug: "essen" }] }),
      word("b", { themen: [{ id: 1, name: "Essen", slug: "essen" }] }),
    ];
    fetchAllWords.mockResolvedValue(ws);
    fetchAllThemen.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({
        count: i === 0 ? 2 : i,
        id: i + 1,
        name: `T${i}`,
        slug: `t${i}`,
        typischerSatz: i === 0 ? "Sag ma." : null,
      })),
    );
    const { topics } = await load();
    expect(topics).toHaveLength(6);
    expect(topics.map((t) => t.count)).toEqual(topics.map((t) => t.count).sort((a, b) => b - a));
    expect(topics.find((t) => t.slug === "t0")).toMatchObject({
      examples: ["a", "b"],
      saying: "Sag ma.",
    });
  });

  it("maps the global: tryWords (published only, max 4), links, rules and faq html", async () => {
    fetchAllWords.mockResolvedValue([word("aasen"), word("bolle")]);
    fetchHomeGlobal.mockResolvedValue({
      aboutText: "Über uns",
      browseLinks: [{ href: "/wort", icon: "random", label: "Zufall" }],
      intro: "Hallo",
      soundRules: [{ berlin: "ick", example: "ick", rule: "g wird j", standard: "ich" }],
      tryWords: [2, { id: 99 }, 99, 5],
    });
    const home = await load();
    expect(home.tryWords).toEqual([{ lemma: "bolle", slug: "bolle" }]);
    expect(home).toMatchObject({
      about: { text: "Über uns" },
      browseLinks: [{ href: "/wort", icon: "random", label: "Zufall" }],
      intro: "Hallo",
      soundRules: [{ berlin: "ick", standard: "ich" }],
    });
  });

  it("keeps only FAQ rows with a question and a text, and drops one that cannot render", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchHomeGlobal.mockResolvedValue({
      faq: [
        { answer: { text: "Antwort" }, question: "Was?" },
        { answer: { text: "Antwort" }, question: "  " },
        { answer: { text: " " }, question: "Leer?" },
        { answer: { boom: true, text: "kaputt" }, question: "Kaputt?" },
      ],
    });
    const { faq } = await load();
    expect(faq).toEqual([{ answerHtml: "<p>Antwort</p>", question: "Was?" }]);
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ message: '[home] FAQ "Kaputt?" skipped' }),
    );
    error.mockRestore();
  });

  it("warns in production when intro, knowledge or FAQ are missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("PROD", true);
    await load();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[home] CMS texts missing"));
    vi.unstubAllEnvs();
    warn.mockRestore();
  });

  it("warns about try-words that are unpublished or deleted", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchAllWords.mockResolvedValue([word("bolle")]);
    fetchHomeGlobal.mockResolvedValue({ tryWords: [5, { id: 99 }] });
    await load();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ids: 99"));
    warn.mockRestore();
  });

  it("drops the magazine and the vote counts when their sources fail, without failing the page", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchAllPosts.mockRejectedValue(new Error("posts down"));
    count.mockRejectedValue(new Error("db down"));
    fetchAllWords.mockResolvedValue([word("aasen"), word("bolle")]);
    const home = await load();
    expect(home.magazine).toBeNull();
    expect(home.about.counts.votes).toBe(0);
    expect(home.poll).toMatchObject({ totalVotes: 0 });
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ message: "[home] posts unavailable" }),
    );
    error.mockRestore();
  });

  it("builds the magazine teaser from the newest post", async () => {
    const long = Array.from({ length: 450 }, (_, i) => `w${i}`).join(" ");
    fetchAllPosts.mockResolvedValue([
      {
        blocks: [`<blockquote class="x"><p>Zitat</p></blockquote><p>${long}</p>`],
        readingTime: 3,
        slug: "p1",
        teaserIpa: "ˈaɪns",
        teaserZitat: null,
        title: "Eins",
      },
      { blocks: [], readingTime: 1, slug: "p2", title: "Zwei" },
    ]);
    const { magazine } = await load();
    expect(magazine).toMatchObject({
      ipa: "ˈaɪns",
      others: [{ slug: "p2", title: "Zwei" }],
      quote: "Zitat",
      readingMinutes: 3,
      slug: "p1",
    });
    expect(magazine!.excerpt.split(" ")).toHaveLength(90);
    expect(magazine!.excerpt).not.toContain("<");
  });

  it("skips newer posts without a quote and lists them under the others", async () => {
    fetchAllPosts.mockResolvedValue([
      { blocks: ["<p>Kein Zitat</p>"], readingTime: 1, slug: "neu", title: "Neu" },
      { blocks: [], readingTime: 2, slug: "alt", teaserZitat: "Dit is dit", title: "Alt" },
    ]);
    const { magazine } = await load();
    expect(magazine).toMatchObject({
      others: [{ slug: "neu", title: "Neu" }],
      quote: "Dit is dit",
      slug: "alt",
    });
  });
});
