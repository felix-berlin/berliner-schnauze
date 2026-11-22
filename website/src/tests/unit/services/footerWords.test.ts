import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchAllWords = vi.hoisted(() => vi.fn());
vi.mock("@services/payload/words.ts", () => ({ fetchAllWords }));

import { fetchFooterData } from "@services/payload/footerWords.ts";

const word = (slug: string) => ({
  article: null,
  berlinerisch: `Lemma ${slug}`,
  examples: [],
  slug,
  translations: [{ translation: `Bedeutung ${slug}` }],
  wordTypes: [],
});

describe("fetchFooterData", () => {
  beforeEach(() => {
    fetchAllWords.mockReset();
    vi.restoreAllMocks();
  });

  it("reads the cached word list once and leaves out the page's own word", async () => {
    fetchAllWords.mockResolvedValue(["a", "b", "c"].map(word));
    const { wordCount, words } = await fetchFooterData("b");
    expect(fetchAllWords).toHaveBeenCalledTimes(1);
    expect(words.map((w) => w.slug).sort()).toEqual(["a", "c"]);
    expect(wordCount).toBe(3);
  });

  it("caps the sign at 30 words but counts the whole list", async () => {
    fetchAllWords.mockResolvedValue(Array.from({ length: 200 }, (_, i) => word(`w${i}`)));
    const { wordCount, words } = await fetchFooterData();
    expect(words).toHaveLength(30);
    expect(wordCount).toBe(200);
  });

  it("returns an empty footer and reports the error when the words cannot be read", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("db down");
    fetchAllWords.mockRejectedValue(failure);
    expect(await fetchFooterData()).toEqual({ wordCount: 0, words: [] });
    const [reported] = logged.mock.calls[0] as [Error];
    expect(reported.message).toBe("[footer] word list unavailable");
    expect(reported.cause).toBe(failure);
  });
});
