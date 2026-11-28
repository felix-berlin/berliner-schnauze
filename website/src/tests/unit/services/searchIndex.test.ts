import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const current = [{ form: { length: 4, soundex: "A400", syllables: 2 }, has: {}, slug: "ahle" }];
const old = [{ slug: "ahle" }];
const reply = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body)));

describe("fetchSearchIndex", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.resetModules(); // fresh single-flight per test
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("loads the versioned url", async () => {
    fetchMock.mockImplementation(() => reply(current));
    const { SEARCH_INDEX_URL, fetchSearchIndex } = await import("@services/searchIndex.ts");
    expect(await fetchSearchIndex()).toEqual(current);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]![0]).toBe(SEARCH_INDEX_URL);
  });

  it("refetches an old-shape index past the caches", async () => {
    fetchMock.mockImplementationOnce(() => reply(old)).mockImplementationOnce(() => reply(current));
    const { SEARCH_INDEX_URL, fetchSearchIndex } = await import("@services/searchIndex.ts");
    expect(await fetchSearchIndex()).toEqual(current);
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(String(url)).toMatch(new RegExp(`^${SEARCH_INDEX_URL.replace("?", "\\?")}&fresh=\\d+$`));
    expect(init).toEqual({ cache: "no-store" });
  });

  it("rejects when the fresh index is still old, and retries on the next call", async () => {
    fetchMock.mockImplementation(() => reply(old));
    const { fetchSearchIndex } = await import("@services/searchIndex.ts");
    await expect(fetchSearchIndex()).rejects.toThrow("outdated shape");
    fetchMock.mockImplementation(() => reply(current));
    expect(await fetchSearchIndex()).toEqual(current);
  });
});
