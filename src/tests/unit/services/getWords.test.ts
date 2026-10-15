import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const readWordsCache = vi.fn();
const writeWordsCache = vi.fn();

vi.mock("astro:env/client", () => ({ SHOW_TEST_DATA: false }));
const serverEnv = vi.hoisted(() => ({ E2E_WORD_LIMIT: 2 as number | undefined }));
vi.mock("astro:env/server", () => serverEnv);
vi.mock("@services/wpGraphqlClient", () => ({
  wpGraphqlClient: { query: (...args: unknown[]) => ({ toPromise: () => queryMock(...args) }) },
}));
vi.mock("@services/devWordsCache", () => ({ readWordsCache, writeWordsCache }));

const page = (edges: unknown[], hasNextPage: boolean, endCursor = "c") => ({
  data: { berlinerWords: { edges, pageInfo: { endCursor, hasNextPage } } },
  error: undefined,
});

// Fake WP: pages of edges, addressed by the cursor `cursor-<n>` (page n+1). The cursor query
// (no `field` variable) only answers with pageInfo; the full query answers with the edges.
const mockWordPages = (pages: unknown[][]) =>
  queryMock.mockImplementation((_doc: unknown, vars: { after: string | null; field?: string }) => {
    const index = vars.after ? Number(vars.after.split("-")[1]) : 0;
    const hasNextPage = index < pages.length - 1;
    const endCursor = `cursor-${index + 1}`;
    return Promise.resolve(
      vars.field
        ? page(pages[index] ?? [], hasNextPage, endCursor)
        : { data: { berlinerWords: { pageInfo: { endCursor, hasNextPage } } }, error: undefined },
    );
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
  vi.unstubAllEnvs();
  serverEnv.E2E_WORD_LIMIT = 2;
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

  it("fetches the pages in order, then writes the complete result to the cache", async () => {
    mockWordPages([[edge("a")], [edge("b")]]);
    const { fetchAllWords } = await load();

    expect(await fetchAllWords()).toEqual([normalized("a"), normalized("b")]);
    expect(queryMock.mock.calls.some(([, vars]) => vars.after === "cursor-1" && vars.field)).toBe(
      true,
    );
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

  it("keeps the leading pages but skips the cache when a later page fails", async () => {
    mockWordPages([[edge("a")], [edge("b")]]);
    const ok = queryMock.getMockImplementation()!;
    queryMock.mockImplementation((doc, vars) =>
      vars.field && vars.after === "cursor-1"
        ? Promise.resolve({ data: undefined, error: new Error("boom") })
        : ok(doc, vars),
    );
    const { fetchAllWords } = await load();

    expect(await fetchAllWords()).toEqual([normalized("a")]);
    expect(writeWordsCache).not.toHaveBeenCalled();
  });

  it("does not cache when the response has no data", async () => {
    queryMock.mockResolvedValue({ data: { berlinerWords: null }, error: undefined });
    const { fetchAllWords } = await load();

    expect(await fetchAllWords()).toEqual([]);
    expect(writeWordsCache).not.toHaveBeenCalled();
  });
});

describe("fetchAllWords in a plain build", () => {
  const loadBuild = async (buildId: string) => {
    vi.stubEnv("WORDS_BUILD_ID", buildId);
    vi.stubEnv("DEV", false); // vitest runs with import.meta.env.DEV on
    serverEnv.E2E_WORD_LIMIT = undefined;
    return load();
  };

  it("reuses the words another thread of the same build fetched", async () => {
    readWordsCache.mockResolvedValue({ buildId: "b1", edges: [edge("shared")] });
    const { fetchAllWords } = await loadBuild("b1");

    expect(await fetchAllWords()).toEqual([normalized("shared")]);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("ignores an entry of an earlier build and shares its own fetch", async () => {
    readWordsCache.mockResolvedValue({ buildId: "old", edges: [edge("stale")] });
    mockWordPages([[edge("fresh")]]);
    const { fetchAllWords } = await loadBuild("b2");

    expect(await fetchAllWords()).toEqual([normalized("fresh")]);
    expect(writeWordsCache).toHaveBeenCalledWith("words_TITLE_ASC_PUBLISH_build", {
      buildId: "b2",
      edges: [edge("fresh")],
    });
  });
});

describe("limitPagesForE2e", () => {
  it("keeps the first N words plus the required slugs", async () => {
    const { limitPagesForE2e } = await load();
    const words = ["a", "b", "c", "anmachen", "d", "aasen"].map((slug) => ({ slug }));

    expect(limitPagesForE2e(words).map((w) => w.slug)).toEqual(["a", "b", "anmachen", "aasen"]);
  });
});
