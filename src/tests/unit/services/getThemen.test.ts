import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({ WP_API: "http://test.local/graphql" }));
vi.mock("astro:env/server", () => ({ WP_AUTH_PASS: "test", WP_AUTH_USER: "test" }));

const toPromiseMock = vi.fn();
const queryMock = vi.fn(() => ({ toPromise: toPromiseMock }));

vi.mock("@urql/core", () => ({
  cacheExchange: {},
  Client: vi.fn().mockImplementation(function (this: { query: typeof queryMock }) {
    this.query = queryMock;
  }),
  fetchExchange: {},
}));

beforeEach(() => {
  vi.resetModules();
  toPromiseMock.mockReset();
  queryMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchAllThemen", () => {
  it("returns thema nodes on success", async () => {
    toPromiseMock.mockResolvedValue({
      data: { berlinerischThemen: { nodes: [{ name: "Essen", slug: "essen-trinken" }] } },
      error: undefined,
    });
    const { fetchAllThemen } = await import("@services/queries/getThemen");
    const result = await fetchAllThemen();
    expect(result).toEqual([{ name: "Essen", slug: "essen-trinken" }]);
  });

  it("returns empty array when nodes are missing", async () => {
    toPromiseMock.mockResolvedValue({ data: { berlinerischThemen: null }, error: undefined });
    const { fetchAllThemen } = await import("@services/queries/getThemen");
    expect(await fetchAllThemen()).toEqual([]);
  });

  it("caches result — second call does not refetch", async () => {
    toPromiseMock.mockResolvedValue({
      data: { berlinerischThemen: { nodes: [] } },
      error: undefined,
    });
    const { fetchAllThemen } = await import("@services/queries/getThemen");
    await fetchAllThemen();
    await fetchAllThemen();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("rejects on GraphQL error and evicts the cache so the next call retries", async () => {
    const gqlError = new Error("GraphQL boom");
    toPromiseMock
      .mockResolvedValueOnce({ data: undefined, error: gqlError })
      .mockResolvedValueOnce({
        data: { berlinerischThemen: { nodes: [{ name: "Geld", slug: "geld" }] } },
        error: undefined,
      });
    const { fetchAllThemen } = await import("@services/queries/getThemen");

    await expect(fetchAllThemen()).rejects.toThrow("GraphQL boom");

    const result = await fetchAllThemen();
    expect(result).toEqual([{ name: "Geld", slug: "geld" }]);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });
});
