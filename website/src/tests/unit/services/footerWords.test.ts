import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchAllWords = vi.hoisted(() => vi.fn());
vi.mock("@services/payload/words.ts", () => ({ fetchAllWords }));

import { fetchFooterWords } from "@services/payload/footerWords.ts";

const word = (slug: string) => ({
  article: null,
  berlinerisch: `Lemma ${slug}`,
  examples: [],
  slug,
  translations: [{ translation: `Bedeutung ${slug}` }],
  wordTypes: [],
});

describe("fetchFooterWords", () => {
  beforeEach(() => {
    fetchAllWords.mockReset();
    vi.restoreAllMocks();
  });

  it("reads the cached word list once per call and leaves out the page's own word", async () => {
    fetchAllWords.mockResolvedValue(["a", "b", "c"].map(word));
    const words = await fetchFooterWords("b");
    expect(fetchAllWords).toHaveBeenCalledTimes(1);
    expect(words.map((w) => w.slug).sort()).toEqual(["a", "c"]);
  });

  it("caps the list at 30 words", async () => {
    fetchAllWords.mockResolvedValue(Array.from({ length: 200 }, (_, i) => word(`w${i}`)));
    expect(await fetchFooterWords()).toHaveLength(30);
  });

  it("returns an empty list and logs when the words cannot be read", async () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchAllWords.mockRejectedValue(new Error("db down"));
    expect(await fetchFooterWords()).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("[footer] words unavailable"),
      expect.anything(),
    );
  });
});
