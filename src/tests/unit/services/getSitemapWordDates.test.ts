import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makePage(
  edges: { slug: string; modifiedGmt: string }[],
  hasNextPage: boolean,
  endCursor: string,
) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      data: {
        berlinerWords: {
          edges: edges.map((e) => ({ node: e })),
          pageInfo: { hasNextPage, endCursor },
        },
      },
    }),
  } as unknown as Response;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.WP_API;
});

describe("getWordDates", () => {
  it("returns empty map when WP_API is not set", async () => {
    delete process.env.WP_API;
    const { getWordDates } = await import("@services/queries/getSitemapWordDates");
    expect((await getWordDates()).size).toBe(0);
  });

  it("fetches single page and returns slug → ISO date", async () => {
    process.env.WP_API = "http://test.local/graphql";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        makePage([{ slug: "aalen", modifiedGmt: "2025-04-09T12:00:00" }], false, ""),
      ),
    );
    const { getWordDates } = await import("@services/queries/getSitemapWordDates");
    const result = await getWordDates();
    expect(result.get("aalen")).toBe(new Date("2025-04-09T12:00:00Z").toISOString());
  });

  it("follows pagination cursors", async () => {
    process.env.WP_API = "http://test.local/graphql";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makePage([{ slug: "aalen", modifiedGmt: "2025-01-01T00:00:00" }], true, "cursor1"),
      )
      .mockResolvedValueOnce(
        makePage([{ slug: "bier", modifiedGmt: "2025-01-02T00:00:00" }], false, ""),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { getWordDates } = await import("@services/queries/getSitemapWordDates");
    const result = await getWordDates();
    expect(result.size).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("breaks early when berlinerWords missing from response", async () => {
    process.env.WP_API = "http://test.local/graphql";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: {} }),
    }));
    const { getWordDates } = await import("@services/queries/getSitemapWordDates");
    expect((await getWordDates()).size).toBe(0);
  });

  it("skips entries with empty slug or empty modifiedGmt", async () => {
    process.env.WP_API = "http://test.local/graphql";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        makePage(
          [
            { slug: "", modifiedGmt: "2025-01-01T00:00:00" },
            { slug: "aalen", modifiedGmt: "" },
            { slug: "bier", modifiedGmt: "2025-01-02T00:00:00" },
          ],
          false,
          "",
        ),
      ),
    );
    const { getWordDates } = await import("@services/queries/getSitemapWordDates");
    const result = await getWordDates();
    expect(result.size).toBe(1);
    expect(result.has("bier")).toBe(true);
  });

  it("caches result — second call does not refetch", async () => {
    process.env.WP_API = "http://test.local/graphql";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        makePage([{ slug: "aalen", modifiedGmt: "2025-04-09T12:00:00" }], false, ""),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { getWordDates } = await import("@services/queries/getSitemapWordDates");
    await getWordDates();
    await getWordDates();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
