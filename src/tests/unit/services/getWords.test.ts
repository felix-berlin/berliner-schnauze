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
});

describe("fetchAllWords in dev", () => {
  it("returns cached words without querying WordPress", async () => {
    readWordsCache.mockResolvedValue([{ node: { slug: "cached" } }]);
    const { fetchAllWords } = await load();

    expect(await fetchAllWords()).toEqual([{ node: { slug: "cached" } }]);
    expect(queryMock).not.toHaveBeenCalled();
    expect(writeWordsCache).not.toHaveBeenCalled();
  });

  it("paginates, then writes the complete result to the cache", async () => {
    queryMock
      .mockResolvedValueOnce(page([{ node: { slug: "a" } }], true, "cursor-1"))
      .mockResolvedValueOnce(page([{ node: { slug: "b" } }], false));
    const { fetchAllWords } = await load();

    const words = await fetchAllWords();

    expect(words).toEqual([{ node: { slug: "a" } }, { node: { slug: "b" } }]);
    expect(queryMock.mock.calls[1]?.[1]).toMatchObject({ after: "cursor-1" });
    expect(writeWordsCache).toHaveBeenCalledWith("words_TITLE_ASC_PUBLISH", words);
  });

  it("uses a separate cache key for the links query", async () => {
    queryMock.mockResolvedValue(page([], false));
    const { fetchAllWordsLinks } = await load();

    await fetchAllWordsLinks();

    expect(readWordsCache).toHaveBeenCalledWith("words-links_TITLE_ASC_PUBLISH");
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
    const edges = ["a", "b", "c", "anmachen", "d", "aasen"].map((slug) => ({ node: { slug } }));

    expect(limitPagesForE2e(edges).map((e) => e.node.slug)).toEqual([
      "a",
      "b",
      "anmachen",
      "aasen",
    ]);
  });
});
