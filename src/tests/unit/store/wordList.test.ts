import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── static fixtures ─────────────────────────────────────────────────────────

const metaResponse = {
  availableWordGroups: ["B", "S"],
  rangeFilterMinMax: {
    characterLength: { min: 1, max: 20 },
    consonantsCount: { min: 0, max: 10 },
    syllablesCount: { min: 1, max: 5 },
    vowelsCount: { min: 0, max: 8 },
  },
  wordTypes: ["Nomen", "Verb"],
};

const indexResponse = [
  {
    berlinerischWordTypes: ["Nomen"],
    dateGmt: "2024-01-01T00:00:00",
    dateTs: 1704067200,
    id: "1",
    modifiedGmt: "2024-01-02T00:00:00",
    modifiedTs: 1704153600,
    slug: "schnauze",
    wordComponents: ["schnauze", "berlin"],
    wordGroup: "S",
    wordProperties: {
      audioBerlinerisch: false,
      audioExamples: false,
      berlinerisch: "Schnauze",
      berolinismus: false,
      characterLength: 8,
      consonantsCount: 5,
      multipleMeanings: false,
      similarSoundingWords: false,
      syllablesCount: 2,
      translations: ["Mund"],
      vowelsCount: 3,
    },
  },
  {
    berlinerischWordTypes: ["Verb"],
    dateGmt: "2023-01-01T00:00:00",
    dateTs: 1672531200,
    id: "2",
    modifiedGmt: "2024-06-01T00:00:00",
    modifiedTs: 1717200000,
    slug: "kieken",
    wordComponents: ["kieken", "berlin"],
    wordGroup: "K",
    wordProperties: {
      audioBerlinerisch: false,
      audioExamples: false,
      berlinerisch: "Kieken",
      berolinismus: false,
      characterLength: 6,
      consonantsCount: 3,
      multipleMeanings: false,
      similarSoundingWords: false,
      syllablesCount: 2,
      translations: ["schauen", "Mund"],
      vowelsCount: 3,
    },
  },
];

// ─── module mocks ─────────────────────────────────────────────────────────────

vi.mock("@nanostores/persistent", () => ({
  persistentMap: vi.fn((key: string, initial: unknown) => {
    const { map } = require("nanostores");
    return map(initial);
  }),
}));

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@utils/helpers.ts", () => ({
  useViewTransition: vi.fn((fn: () => void) => fn()),
}));

// The highlight plugin's async afterInsert causes insertMultiple to use the sync path
// without awaiting individual insert() Promises, leaving the Radix index empty.
// Replace with sync stubs so the index is fully populated before search runs.
vi.mock("@orama/plugin-match-highlight", async () => {
  const { search } = await import("@orama/orama");
  return {
    afterInsert: vi.fn(), // sync no-op keeps insertMultiple on the sync path with proper Promises
    searchWithHighlight: vi.fn((db: unknown, params: unknown) =>
      (search as (db: unknown, params: unknown) => unknown)(db, params),
    ),
  };
});

// ─── setup ────────────────────────────────────────────────────────────────────

function makeFetch(overrides: Record<string, unknown> = {}) {
  return vi.fn().mockImplementation((url: string) => {
    if (url in overrides) return overrides[url];
    if (url === "/api/search/meta.json") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(metaResponse) });
    }
    if (url === "/api/search/index.json") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(indexResponse) });
    }
    return Promise.reject(new Error(`Unmocked fetch: ${url}`));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.stubGlobal("fetch", makeFetch());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ─── $activeFilterCount ───────────────────────────────────────────────────────

describe("$activeFilterCount", () => {
  it("returns 0 with all defaults", async () => {
    const { $activeFilterCount } = await import("@stores/wordList.ts");
    expect($activeFilterCount.get()).toBe(0);
  });

  it("increments for non-empty activeLetterFilter", async () => {
    const { $activeFilterCount, $wordSearch } = await import("@stores/wordList.ts");
    $wordSearch.setKey("activeLetterFilter", "B");
    expect($activeFilterCount.get()).toBe(1);
  });

  it("increments for non-empty activeWordTypeFilter", async () => {
    const { $activeFilterCount, $wordSearch } = await import("@stores/wordList.ts");
    $wordSearch.setKey("activeWordTypeFilter", ["Nomen"]);
    expect($activeFilterCount.get()).toBe(1);
  });

  it("increments for each true boolean flag", async () => {
    const { $activeFilterCount, $wordSearch } = await import("@stores/wordList.ts");
    $wordSearch.setKey("berolinismus", true);
    $wordSearch.setKey("audioBerlinerisch", true);
    $wordSearch.setKey("audioExamples", true);
    expect($activeFilterCount.get()).toBe(3);
  });

  it("increments for each non-null number filter", async () => {
    const { $activeFilterCount, $wordSearch } = await import("@stores/wordList.ts");
    $wordSearch.setKey("characterCount", 5);
    $wordSearch.setKey("vowelsCount", 2);
    $wordSearch.setKey("consonantsCount", 3);
    expect($activeFilterCount.get()).toBe(3);
  });
});

// ─── resetAll ─────────────────────────────────────────────────────────────────

describe("resetAll", () => {
  it("resets all filters to defaults and tracks event", async () => {
    const { resetAll, $wordSearch, $searchQuery } = await import("@stores/wordList.ts");
    const { trackEvent } = await import("@utils/analytics");
    $wordSearch.setKey("activeLetterFilter", "B");
    $wordSearch.setKey("berolinismus", true);
    $searchQuery.set("test");
    $wordSearch.setKey("activeOrderCategory", "date");
    resetAll();
    const ws = $wordSearch.get();
    expect(ws.activeLetterFilter).toBe("");
    expect(ws.berolinismus).toBe(false);
    expect($searchQuery.get()).toBe("");
    expect(ws.activeOrderCategory).toBe("alphabetical");
    expect(trackEvent).toHaveBeenCalledWith("WordList", "Reset", "All filters reset");
  });
});

// ─── $showWordListFilterFlyout ────────────────────────────────────────────────

describe("$showWordListFilterFlyout / $toggleWordListFilterFlyout", () => {
  it("starts as false", async () => {
    const { $showWordListFilterFlyout } = await import("@stores/wordList.ts");
    expect($showWordListFilterFlyout.get()).toBe(false);
  });

  it("toggles false → true", async () => {
    const { $showWordListFilterFlyout, $toggleWordListFilterFlyout } = await import(
      "@stores/wordList.ts"
    );
    $toggleWordListFilterFlyout();
    expect($showWordListFilterFlyout.get()).toBe(true);
  });

  it("toggles true → false", async () => {
    const { $showWordListFilterFlyout, $toggleWordListFilterFlyout } = await import(
      "@stores/wordList.ts"
    );
    $showWordListFilterFlyout.set(true);
    $toggleWordListFilterFlyout();
    expect($showWordListFilterFlyout.get()).toBe(false);
  });
});

// ─── setLetterFilter ──────────────────────────────────────────────────────────

describe("setLetterFilter", () => {
  it("sets activeLetterFilter and tracks event", async () => {
    const { setLetterFilter, $wordSearch } = await import("@stores/wordList.ts");
    const { trackEvent } = await import("@utils/analytics");
    setLetterFilter("S");
    expect($wordSearch.get().activeLetterFilter).toBe("S");
    expect(trackEvent).toHaveBeenCalledWith("WordList", "Filter", "Letter: S");
  });
});

// ─── setWordTypeFilter ────────────────────────────────────────────────────────

describe("setWordTypeFilter", () => {
  it("adds a word type when not present", async () => {
    const { setWordTypeFilter, $wordSearch } = await import("@stores/wordList.ts");
    setWordTypeFilter("Nomen");
    expect($wordSearch.get().activeWordTypeFilter).toContain("Nomen");
  });

  it("removes a word type when already present (toggleInArray)", async () => {
    const { setWordTypeFilter, $wordSearch } = await import("@stores/wordList.ts");
    $wordSearch.setKey("activeWordTypeFilter", ["Nomen", "Verb"]);
    setWordTypeFilter("Nomen");
    expect($wordSearch.get().activeWordTypeFilter).not.toContain("Nomen");
    expect($wordSearch.get().activeWordTypeFilter).toContain("Verb");
  });
});

// ─── setActiveOrderCategory ───────────────────────────────────────────────────

describe("setActiveOrderCategory", () => {
  it("sets activeOrderCategory to 'date'", async () => {
    const { setActiveOrderCategory, $wordSearch } = await import("@stores/wordList.ts");
    setActiveOrderCategory("date");
    expect($wordSearch.get().activeOrderCategory).toBe("date");
  });

  it("sets activeOrderCategory to 'modifiedDate'", async () => {
    const { setActiveOrderCategory, $wordSearch } = await import("@stores/wordList.ts");
    setActiveOrderCategory("modifiedDate");
    expect($wordSearch.get().activeOrderCategory).toBe("modifiedDate");
  });
});

// ─── order toggles ────────────────────────────────────────────────────────────

describe("$alphabeticalOrderToggle", () => {
  it("ASC → DESC", async () => {
    const { $alphabeticalOrderToggle, $wordSearch } = await import("@stores/wordList.ts");
    $alphabeticalOrderToggle();
    expect($wordSearch.get().alphabeticalOrder).toBe("DESC");
  });

  it("DESC → ASC", async () => {
    const { $alphabeticalOrderToggle, $wordSearch } = await import("@stores/wordList.ts");
    $wordSearch.setKey("alphabeticalOrder", "DESC");
    $alphabeticalOrderToggle();
    expect($wordSearch.get().alphabeticalOrder).toBe("ASC");
  });
});

describe("$wordListDateOrderToggle", () => {
  it("ASC → DESC", async () => {
    const { $wordListDateOrderToggle, $wordSearch } = await import("@stores/wordList.ts");
    $wordListDateOrderToggle();
    expect($wordSearch.get().dateOrder).toBe("DESC");
  });

  it("DESC → ASC", async () => {
    const { $wordListDateOrderToggle, $wordSearch } = await import("@stores/wordList.ts");
    $wordSearch.setKey("dateOrder", "DESC");
    $wordListDateOrderToggle();
    expect($wordSearch.get().dateOrder).toBe("ASC");
  });
});

describe("$wordListModifiedDateOrderToggle", () => {
  it("ASC → DESC", async () => {
    const { $wordListModifiedDateOrderToggle, $wordSearch } = await import("@stores/wordList.ts");
    $wordListModifiedDateOrderToggle();
    expect($wordSearch.get().modifiedDateOrder).toBe("DESC");
  });

  it("DESC → ASC", async () => {
    const { $wordListModifiedDateOrderToggle, $wordSearch } = await import("@stores/wordList.ts");
    $wordSearch.setKey("modifiedDateOrder", "DESC");
    $wordListModifiedDateOrderToggle();
    expect($wordSearch.get().modifiedDateOrder).toBe("ASC");
  });
});

// ─── $setSortOrder ────────────────────────────────────────────────────────────

describe("$setSortOrder", () => {
  it("sets category, order key, and tracks event", async () => {
    const { $setSortOrder, $wordSearch } = await import("@stores/wordList.ts");
    const { trackEvent } = await import("@utils/analytics");
    $setSortOrder("date", "dateOrder", "DESC");
    expect($wordSearch.get().activeOrderCategory).toBe("date");
    expect($wordSearch.get().dateOrder).toBe("DESC");
    expect(trackEvent).toHaveBeenCalledWith("WordList", "Sort Order", "date: DESC");
  });
});

// ─── setSearch ────────────────────────────────────────────────────────────────

describe("setSearch", () => {
  it("updates the search string", async () => {
    const { setSearch, $searchQuery } = await import("@stores/wordList.ts");
    setSearch("Schnauze");
    expect($searchQuery.get()).toBe("Schnauze");
  });
});

// ─── $toggleBerolinismus ──────────────────────────────────────────────────────

describe("$toggleBerolinismus", () => {
  it("sets berolinismus to true and tracks event", async () => {
    const { $toggleBerolinismus, $wordSearch } = await import("@stores/wordList.ts");
    const { trackEvent } = await import("@utils/analytics");
    $toggleBerolinismus();
    expect($wordSearch.get().berolinismus).toBe(true);
    expect(trackEvent).toHaveBeenCalledWith("WordList", "Filter", "Berolinismus: true");
  });

  it("toggles berolinismus back to false", async () => {
    const { $toggleBerolinismus, $wordSearch } = await import("@stores/wordList.ts");
    $wordSearch.setKey("berolinismus", true);
    $toggleBerolinismus();
    expect($wordSearch.get().berolinismus).toBe(false);
  });
});

// ─── searchLength ─────────────────────────────────────────────────────────────

describe("searchLength", () => {
  it("returns 0 for default empty search", async () => {
    const { searchLength } = await import("@stores/wordList.ts");
    expect(searchLength.get()).toBe(0);
  });

  it("returns length of current search string", async () => {
    const { searchLength, $searchQuery } = await import("@stores/wordList.ts");
    $searchQuery.set("Hund");
    expect(searchLength.get()).toBe(4);
  });
});

// ─── onMount / getSearchMeta ──────────────────────────────────────────────────

describe("onMount — getSearchMeta", () => {
  it("loads letterGroups, wordTypes, and rangeFilterMinMax on first subscriber", async () => {
    const { $wordSearch } = await import("@stores/wordList.ts");
    const unsub = $wordSearch.subscribe(() => {});
    await vi.waitFor(() => {
      expect($wordSearch.get().letterGroups).toEqual(["B", "S"]);
    });
    expect($wordSearch.get().wordTypes).toEqual(["Nomen", "Verb"]);
    expect($wordSearch.get().rangeFilterMinMax).toEqual(metaResponse.rangeFilterMinMax);
    unsub();
  });

  it("logs error when meta fetch network fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const { $wordSearch } = await import("@stores/wordList.ts");
    const unsub = $wordSearch.subscribe(() => {});
    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "[wordList] Failed to load search meta:",
        expect.any(Error),
      );
    });
    unsub();
    consoleSpy.mockRestore();
  });

  it("logs error when meta response is not ok", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: vi.fn() }),
    );
    const { $wordSearch } = await import("@stores/wordList.ts");
    const unsub = $wordSearch.subscribe(() => {});
    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "[wordList] Failed to load search meta:",
        expect.any(Error),
      );
    });
    unsub();
    consoleSpy.mockRestore();
  });
});

// ─── $oramaSearchResults ──────────────────────────────────────────────────────

describe("$oramaSearchResults", () => {
  it("resolves to ready state with search results", async () => {
    const { $oramaSearchResults } = await import("@stores/wordList.ts");
    await vi.waitFor(
      () => {
        expect($oramaSearchResults.get().state).toBe("ready");
      },
      { timeout: 5000 },
    );
  });

  it("handles search index fetch failure gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { $oramaSearchResults } = await import("@stores/wordList.ts");
    await vi.waitFor(
      () => {
        const result = $oramaSearchResults.get();
        expect(result.state).toBe("ready");
        expect(result.value).toBeNull();
      },
      { timeout: 5000 },
    );
    expect(consoleSpy).toHaveBeenCalledWith("[wordList] Search failed:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("handles non-ok search index response gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: vi.fn() }),
    );
    const { $oramaSearchResults } = await import("@stores/wordList.ts");
    await vi.waitFor(
      () => {
        const result = $oramaSearchResults.get();
        expect(result.state).toBe("ready");
        expect(result.value).toBeNull();
      },
      { timeout: 5000 },
    );
    consoleSpy.mockRestore();
  });
});

// ─── buildWhere / getSortBy coverage via $oramaSearchResults ─────────────────

describe("buildWhere — filter options", () => {
  it("all boolean and numeric filters produce ready state", async () => {
    const { $wordSearch, $oramaSearchResults } = await import("@stores/wordList.ts");
    $wordSearch.setKey("berolinismus", true);
    $wordSearch.setKey("audioBerlinerisch", true);
    $wordSearch.setKey("audioExamples", true);
    $wordSearch.setKey("multipleMeanings", true);
    $wordSearch.setKey("similarSoundingWords", true);
    $wordSearch.setKey("characterCount", 3);
    $wordSearch.setKey("consonantsCount", 2);
    $wordSearch.setKey("vowelsCount", 1);
    $wordSearch.setKey("syllablesCount", 1);
    $wordSearch.setKey("activeLetterFilter", "S");
    $wordSearch.setKey("activeWordTypeFilter", ["Nomen"]);
    await vi.waitFor(
      () => {
        expect($oramaSearchResults.get().state).toBe("ready");
      },
      { timeout: 5000 },
    );
  });
});

describe("getSortBy — sort orders", () => {
  // Both test documents share "Mund" in translations; searching for it ensures 2+ hits
  // so Orama actually invokes the custom comparator function (lines 350, 355).

  it("date order (ASC) puts older dateTs first", async () => {
    const { $wordSearch, $oramaSearchResults } = await import("@stores/wordList.ts");
    $wordSearch.setKey("activeOrderCategory", "date");
    $wordSearch.setKey("dateOrder", "ASC");
    $wordSearch.setKey("search", "berlin");
    let hits: typeof $oramaSearchResults.get.prototype[] = [];
    await vi.waitFor(
      () => {
        const r = $oramaSearchResults.get();
        expect(r.state).toBe("ready");
        hits = r.value?.hits ?? [];
        expect(hits.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 5000 },
    );
    expect(hits[0].document.dateTs).toBeLessThanOrEqual(hits[1].document.dateTs);
  });

  it("date order (DESC) puts newer dateTs first", async () => {
    const { $wordSearch, $oramaSearchResults } = await import("@stores/wordList.ts");
    $wordSearch.setKey("activeOrderCategory", "date");
    $wordSearch.setKey("dateOrder", "DESC");
    $wordSearch.setKey("search", "berlin");
    let hits: typeof $oramaSearchResults.get.prototype[] = [];
    await vi.waitFor(
      () => {
        const r = $oramaSearchResults.get();
        expect(r.state).toBe("ready");
        hits = r.value?.hits ?? [];
        expect(hits.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 5000 },
    );
    expect(hits[0].document.dateTs).toBeGreaterThanOrEqual(hits[1].document.dateTs);
  });

  it("modifiedDate order (ASC) puts older modifiedTs first", async () => {
    const { $wordSearch, $oramaSearchResults } = await import("@stores/wordList.ts");
    $wordSearch.setKey("activeOrderCategory", "modifiedDate");
    $wordSearch.setKey("modifiedDateOrder", "ASC");
    $wordSearch.setKey("search", "berlin");
    let hits: typeof $oramaSearchResults.get.prototype[] = [];
    await vi.waitFor(
      () => {
        const r = $oramaSearchResults.get();
        expect(r.state).toBe("ready");
        hits = r.value?.hits ?? [];
        expect(hits.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 5000 },
    );
    expect(hits[0].document.modifiedTs).toBeLessThanOrEqual(hits[1].document.modifiedTs);
  });

  it("modifiedDate order (DESC) puts newer modifiedTs first", async () => {
    const { $wordSearch, $oramaSearchResults } = await import("@stores/wordList.ts");
    $wordSearch.setKey("activeOrderCategory", "modifiedDate");
    $wordSearch.setKey("modifiedDateOrder", "DESC");
    $wordSearch.setKey("search", "berlin");
    let hits: typeof $oramaSearchResults.get.prototype[] = [];
    await vi.waitFor(
      () => {
        const r = $oramaSearchResults.get();
        expect(r.state).toBe("ready");
        hits = r.value?.hits ?? [];
        expect(hits.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 5000 },
    );
    expect(hits[0].document.modifiedTs).toBeGreaterThanOrEqual(hits[1].document.modifiedTs);
  });
});

// ─── $searchResultCount ───────────────────────────────────────────────────────

describe("$searchResultCount", () => {
  it("returns a non-negative number once search is ready", async () => {
    const { $oramaSearchResults, $searchResultCount } = await import("@stores/wordList.ts");
    await vi.waitFor(
      () => {
        expect($oramaSearchResults.get().state).toBe("ready");
      },
      { timeout: 5000 },
    );
    expect($searchResultCount.get()).toBeGreaterThanOrEqual(0);
  });

  it("returns 0 when $oramaSearchResults is still loading", async () => {
    const { $searchResultCount } = await import("@stores/wordList.ts");
    // The store starts loading — count should be 0
    expect($searchResultCount.get()).toBe(0);
  });
});
