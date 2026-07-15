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

const successResponse = (nodes: unknown) => ({
  data: { menu: { menuItems: { nodes } } },
  error: undefined,
});

beforeEach(() => {
  vi.resetModules();
  toPromiseMock.mockReset();
  queryMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchMenu", () => {
  it("maps nodes with path and label to link/title", async () => {
    toPromiseMock.mockResolvedValue(
      successResponse([{ label: "Wort Index", linkRelationship: null, path: "/wort" }]),
    );
    const { fetchMenu } = await import("@services/queries/getMenu");

    expect(await fetchMenu("Footer Nav 1")).toEqual([{ link: "/wort", title: "Wort Index" }]);
  });

  it("includes rel when linkRelationship is present", async () => {
    toPromiseMock.mockResolvedValue(
      successResponse([
        {
          label: "tech. Fehler melden",
          linkRelationship: "noopener",
          path: "https://github.com/felix-berlin/berliner-schnauze/issues/new",
        },
      ]),
    );
    const { fetchMenu } = await import("@services/queries/getMenu");

    expect(await fetchMenu("Footer Nav 1")).toEqual([
      {
        link: "https://github.com/felix-berlin/berliner-schnauze/issues/new",
        rel: "noopener",
        title: "tech. Fehler melden",
      },
    ]);
  });

  it("drops a node missing path", async () => {
    toPromiseMock.mockResolvedValue(
      successResponse([{ label: "Impressum", linkRelationship: null, path: null }]),
    );
    const { fetchMenu } = await import("@services/queries/getMenu");

    expect(await fetchMenu("Footer Nav 2")).toEqual([]);
  });

  it("drops a node missing label", async () => {
    toPromiseMock.mockResolvedValue(
      successResponse([{ label: null, linkRelationship: null, path: "/impressum" }]),
    );
    const { fetchMenu } = await import("@services/queries/getMenu");

    expect(await fetchMenu("Footer Nav 2")).toEqual([]);
  });

  it("returns an empty array when menuItems.nodes is missing", async () => {
    toPromiseMock.mockResolvedValue({
      data: { menu: { menuItems: null } },
      error: undefined,
    });
    const { fetchMenu } = await import("@services/queries/getMenu");

    expect(await fetchMenu("Footer Nav 2")).toEqual([]);
  });

  it("returns an empty array when the menu itself is missing", async () => {
    toPromiseMock.mockResolvedValue({ data: { menu: null }, error: undefined });
    const { fetchMenu } = await import("@services/queries/getMenu");

    expect(await fetchMenu("Nonexistent Menu")).toEqual([]);
  });

  it("queries with the given menu name", async () => {
    toPromiseMock.mockResolvedValue(successResponse([]));
    const { fetchMenu } = await import("@services/queries/getMenu");

    await fetchMenu("Footer Nav 2");

    expect(queryMock).toHaveBeenCalledWith(expect.anything(), { name: "Footer Nav 2" });
  });

  it("throws on GraphQL error instead of silently returning empty data", async () => {
    const gqlError = new Error("GraphQL boom");
    toPromiseMock.mockResolvedValue({ data: undefined, error: gqlError });
    const { fetchMenu } = await import("@services/queries/getMenu");

    await expect(fetchMenu("Footer Nav 2")).rejects.toThrow('Fetching menu "Footer Nav 2" failed');
  });
});
