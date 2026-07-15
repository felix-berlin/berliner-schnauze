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

describe("fetchAllPosts", () => {
  it("returns post nodes on success", async () => {
    toPromiseMock.mockResolvedValue({
      data: { posts: { nodes: [{ slug: "test-post", title: "Test Post" }] } },
      error: undefined,
    });
    const { fetchAllPosts } = await import("@services/queries/getPosts");
    const result = await fetchAllPosts();
    expect(result).toEqual([{ slug: "test-post", title: "Test Post" }]);
  });

  it("returns empty array when nodes are missing", async () => {
    toPromiseMock.mockResolvedValue({ data: { posts: null }, error: undefined });
    const { fetchAllPosts } = await import("@services/queries/getPosts");
    expect(await fetchAllPosts()).toEqual([]);
  });

  it("caches result — second call does not refetch", async () => {
    toPromiseMock.mockResolvedValue({ data: { posts: { nodes: [] } }, error: undefined });
    const { fetchAllPosts } = await import("@services/queries/getPosts");
    await fetchAllPosts();
    await fetchAllPosts();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("rejects on GraphQL error and evicts the cache so the next call retries", async () => {
    const gqlError = new Error("GraphQL boom");
    toPromiseMock
      .mockResolvedValueOnce({ data: undefined, error: gqlError })
      .mockResolvedValueOnce({
        data: { posts: { nodes: [{ slug: "retry-post", title: "Retry Post" }] } },
        error: undefined,
      });
    const { fetchAllPosts } = await import("@services/queries/getPosts");

    await expect(fetchAllPosts()).rejects.toThrow("GraphQL boom");

    const result = await fetchAllPosts();
    expect(result).toEqual([{ slug: "retry-post", title: "Retry Post" }]);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });
});
