import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const readWordsCache = vi.fn();
const writeWordsCache = vi.fn();

vi.mock("astro:env/client", () => ({ SHOW_TEST_DATA: false }));
vi.mock("astro:env/server", () => ({ E2E_WORD_LIMIT: 2 }));
vi.mock("@services/wpGraphqlClient", () => ({
  wpGraphqlClient: { query: (...args: unknown[]) => ({ toPromise: () => queryMock(...args) }) },
}));
vi.mock("@services/devWordsCache", () => ({ readWordsCache, writeWordsCache }));

const page = (edges: unknown[], hasNextPage: boolean, endCursor = "c") => ({
  data: { berlinerWords: { edges, pageInfo: { endCursor, hasNextPage } } },
  error: undefined,
});

const edge = (slug: string | null, berlinerisch: string | null = slug) => ({
  node: {
    id: `id-${slug}`,
    slug,
    wordProperties: {
      berlinerisch,
      translations: [{ translation: "x" }, null, { translation: "" }],
    },
  },
});
const normalized = (slug: string) => ({
  id: `id-${slug}`,
  slug,
  translations: ["x"],
  wordProperties: {
    berlinerisch: slug,
    translations: [{ translation: "x" }, null, { translation: "" }],
  },
});

const load = async () => {
  vi.resetModules();
  return import("@services/queries/getWords");
};

beforeEach(() => {
  queryMock.mockReset();
  readWordsCache.mockReset().mockResolvedValue(null);
  writeWordsCache.mockReset();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("fetchAllWords in dev", () => {
  it("returns cached words without querying WordPress", async () => {
    readWordsCache.mockResolvedValue([edge("cached")]);
    const { fetchAllWords } = await load();

    expect(await fetchAllWords()).toEqual([normalized("cached")]);
    expect(queryMock).not.toHaveBeenCalled();
    expect(writeWordsCache).not.toHaveBeenCalled();
  });

  it("paginates, then writes the complete result to the cache", async () => {
    queryMock
      .mockResolvedValueOnce(page([edge("a")], true, "cursor-1"))
      .mockResolvedValueOnce(page([edge("b")], false));
    const { fetchAllWords } = await load();

    expect(await fetchAllWords()).toEqual([normalized("a"), normalized("b")]);
    expect(queryMock.mock.calls[1]?.[1]).toMatchObject({ after: "cursor-1" });
    // The dev cache keeps the raw edges; normalization runs after reading it.
    expect(writeWordsCache).toHaveBeenCalledWith("words_TITLE_ASC_PUBLISH", [edge("a"), edge("b")]);
  });

  it("drops words without slug and defaults a missing berlinerisch to an empty string", async () => {
    readWordsCache.mockResolvedValue([edge(null, "ohne"), edge("leer", null)]);
    const { fetchAllWords } = await load();

    const words = await fetchAllWords();

    expect(words.map((w) => w.slug)).toEqual(["leer"]);
    expect(words[0]?.wordProperties.berlinerisch).toBe("");
  });

  it("does not cache a partial result after a query error", async () => {
    queryMock.mockResolvedValue({ data: undefined, error: new Error("boom") });
    const { fetchAllWords } = await load();

    expect(await fetchAllWords()).toEqual([]);
    expect(writeWordsCache).not.toHaveBeenCalled();
  });

  it("does not cache when the response has no data", async () => {
    queryMock.mockResolvedValue({ data: { berlinerWords: null }, error: undefined });
    const { fetchAllWords } = await load();

    expect(await fetchAllWords()).toEqual([]);
    expect(writeWordsCache).not.toHaveBeenCalled();
  });
});

describe("limitPagesForE2e", () => {
  it("keeps the first N words plus the required slugs", async () => {
    const { limitPagesForE2e } = await load();
    const words = ["a", "b", "c", "anmachen", "d", "aasen"].map((slug) => ({ slug }));

    expect(limitPagesForE2e(words).map((w) => w.slug)).toEqual(["a", "b", "anmachen", "aasen"]);
  });
});
