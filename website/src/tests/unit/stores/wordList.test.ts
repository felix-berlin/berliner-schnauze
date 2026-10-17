import { atom, map } from "nanostores";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type OramaResultsState =
  | { state: "loading" }
  | { state: "ready"; value: { count: number } | null }
  | { state: "failed"; error: Error };

// $oramaSearchResults is a computedAsync store (read-only in its real type);
// these tests write to it directly via the mocked atom returned in its place.
const setOramaResults = (store: unknown, value: OramaResultsState) =>
  (store as { set: (v: OramaResultsState) => void }).set(value);

vi.mock("@nanostores/persistent", () => ({
  persistentMap: vi.fn((key: string, initial: unknown) => map(initial)),
}));

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@utils/helpers.ts", () => ({
  useViewTransition: vi.fn((fn: () => void) => fn()),
}));

const { capturedCbRef } = vi.hoisted(() => ({
  capturedCbRef: { fn: undefined as ((...args: unknown[]) => Promise<unknown>) | undefined },
}));

vi.mock("@nanostores/async", () => ({
  computedAsync: vi.fn((stores: unknown, callback: (...args: unknown[]) => Promise<unknown>) => {
    capturedCbRef.fn = callback;
    return atom(null);
  }),
}));

vi.mock("@orama/orama", () => ({
  create: vi.fn(),
  insertMultiple: vi.fn(),
  search: vi.fn(),
}));

vi.mock("@orama/stemmers/german", () => ({
  language: "german",
  stemmer: vi.fn(),
}));

globalThis.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ availableWordGroups: [], rangeFilterMinMax: {}, wordTypes: [] }),
    ok: true,
  }),
) as unknown as typeof fetch;

const defaultFetch = globalThis.fetch;

describe("wordList store", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("$wordSearch default state", () => {
    it("has correct default values", async () => {
      const { $wordSearch, $searchQuery } = await import("@stores/wordList.ts");
      const state = $wordSearch.get();
      expect(state.activeLetterFilter).toBe("");
      expect(state.activeOrderCategory).toBe("alphabetical");
      expect(state.activeWordTypeFilter).toEqual([]);
      expect(state.activeThemenFilter).toEqual([]);
      expect(state.alphabeticalOrder).toBe("ASC");
      expect(state.berolinismus).toBe(false);
      expect($searchQuery.get()).toBe("");
      expect(state.dateOrder).toBe("ASC");
      expect(state.modifiedDateOrder).toBe("ASC");
    });
  });

  describe("$activeFilterCount", () => {
    it("returns 0 for default state", async () => {
      const { $activeFilterCount } = await import("@stores/wordList.ts");
      expect($activeFilterCount.get()).toBe(0);
    });

    it("counts activeLetterFilter as 1", async () => {
      const { $wordSearch, $activeFilterCount } = await import("@stores/wordList.ts");
      $wordSearch.setKey("activeLetterFilter", "A");
      expect($activeFilterCount.get()).toBe(1);
    });

    it("counts non-empty activeWordTypeFilter as 1", async () => {
      const { $wordSearch, $activeFilterCount } = await import("@stores/wordList.ts");
      $wordSearch.setKey("activeWordTypeFilter", ["Substantiv"]);
      expect($activeFilterCount.get()).toBe(1);
    });

    it("counts non-empty activeThemenFilter as 1", async () => {
      const { $wordSearch, $activeFilterCount } = await import("@stores/wordList.ts");
      $wordSearch.setKey("activeThemenFilter", ["essen-trinken"]);
      expect($activeFilterCount.get()).toBe(1);
    });

    it("counts berolinismus as 1 when true", async () => {
      const { $wordSearch, $activeFilterCount } = await import("@stores/wordList.ts");
      $wordSearch.setKey("berolinismus", true);
      expect($activeFilterCount.get()).toBe(1);
    });

    it("counts audioBerlinerisch as 1 when true", async () => {
      const { $wordSearch, $activeFilterCount } = await import("@stores/wordList.ts");
      $wordSearch.setKey("audioBerlinerisch", true);
      expect($activeFilterCount.get()).toBe(1);
    });

    it("counts multiple active filters", async () => {
      const { $wordSearch, $activeFilterCount } = await import("@stores/wordList.ts");
      $wordSearch.setKey("activeLetterFilter", "B");
      $wordSearch.setKey("berolinismus", true);
      $wordSearch.setKey("audioBerlinerisch", true);
      expect($activeFilterCount.get()).toBe(3);
    });

    it("counts number filters when set", async () => {
      const { $wordSearch, $activeFilterCount } = await import("@stores/wordList.ts");
      $wordSearch.setKey("characterCount", 5);
      $wordSearch.setKey("consonantsCount", 3);
      expect($activeFilterCount.get()).toBe(2);
    });

    it("counts audioExamples as 1 when true", async () => {
      const { $wordSearch, $activeFilterCount } = await import("@stores/wordList.ts");
      $wordSearch.setKey("audioExamples", true);
      expect($activeFilterCount.get()).toBe(1);
    });

    it("counts multipleMeanings as 1 when true", async () => {
      const { $wordSearch, $activeFilterCount } = await import("@stores/wordList.ts");
      $wordSearch.setKey("multipleMeanings", true);
      expect($activeFilterCount.get()).toBe(1);
    });

    it("does not count sort settings", async () => {
      const { $wordSearch, $activeFilterCount } = await import("@stores/wordList.ts");
      $wordSearch.setKey("activeOrderCategory", "date");
      $wordSearch.setKey("dateOrder", "DESC");
      expect($activeFilterCount.get()).toBe(0);
    });

    it("does not count a range filter reset to undefined or null", async () => {
      const { $wordSearch, $activeFilterCount } = await import("@stores/wordList.ts");
      $wordSearch.setKey("vowelsCount", undefined);
      $wordSearch.setKey("syllablesCount", null as unknown as number);
      expect($activeFilterCount.get()).toBe(0);
    });

    it("counts vowelsCount when set", async () => {
      const { $wordSearch, $activeFilterCount } = await import("@stores/wordList.ts");
      $wordSearch.setKey("vowelsCount", 2);
      expect($activeFilterCount.get()).toBe(1);
    });

    it("counts syllablesCount when set", async () => {
      const { $wordSearch, $activeFilterCount } = await import("@stores/wordList.ts");
      $wordSearch.setKey("syllablesCount", 3);
      expect($activeFilterCount.get()).toBe(1);
    });
  });

  describe("resetAll", () => {
    it("resets all filters to defaults", async () => {
      const { $wordSearch, $searchQuery, resetAll } = await import("@stores/wordList.ts");
      $wordSearch.setKey("activeLetterFilter", "Z");
      $wordSearch.setKey("berolinismus", true);
      $searchQuery.set("test");
      $wordSearch.setKey("activeWordTypeFilter", ["Verb"]);
      $wordSearch.setKey("activeThemenFilter", ["essen-trinken"]);

      resetAll();

      const state = $wordSearch.get();
      expect(state.activeLetterFilter).toBe("");
      expect(state.berolinismus).toBe(false);
      expect($searchQuery.get()).toBe("");
      expect(state.activeWordTypeFilter).toEqual([]);
      expect(state.activeThemenFilter).toEqual([]);
      expect(state.alphabeticalOrder).toBe("ASC");
      expect(state.dateOrder).toBe("ASC");
    });

    it("resets range and boolean filters and sort settings", async () => {
      const { $wordSearch, $activeFilterCount, resetAll } = await import("@stores/wordList.ts");
      $wordSearch.setKey("characterCount", 4);
      $wordSearch.setKey("multipleMeanings", true);
      $wordSearch.setKey("activeOrderCategory", "modifiedDate");
      $wordSearch.setKey("modifiedDateOrder", "DESC");

      resetAll();

      const state = $wordSearch.get();
      expect(state.characterCount).toBeUndefined();
      expect(state.multipleMeanings).toBe(false);
      expect(state.activeOrderCategory).toBe("alphabetical");
      expect(state.modifiedDateOrder).toBe("ASC");
      expect($activeFilterCount.get()).toBe(0);
    });

    it("does not share array instances with the defaults", async () => {
      const { $wordSearch, resetAll } = await import("@stores/wordList.ts");
      resetAll();
      $wordSearch.get().activeThemenFilter.push("mutated");
      resetAll();
      expect($wordSearch.get().activeThemenFilter).toEqual([]);
    });

    it("calls trackEvent", async () => {
      const { resetAll } = await import("@stores/wordList.ts");
      const { trackEvent } = await import("@utils/analytics");
      resetAll();
      expect(trackEvent).toHaveBeenCalledWith("WordList", "Reset", "All filters reset");
    });
  });

  describe("$showWordListFilterFlyout", () => {
    it("defaults to false", async () => {
      const { $showWordListFilterFlyout } = await import("@stores/wordList.ts");
      expect($showWordListFilterFlyout.get()).toBe(false);
    });
  });

  describe("$toggleWordListFilterFlyout", () => {
    it("toggles from false to true", async () => {
      const { $showWordListFilterFlyout, $toggleWordListFilterFlyout } =
        await import("@stores/wordList.ts");
      $showWordListFilterFlyout.set(false);
      $toggleWordListFilterFlyout();
      expect($showWordListFilterFlyout.get()).toBe(true);
    });

    it("toggles from true to false", async () => {
      const { $showWordListFilterFlyout, $toggleWordListFilterFlyout } =
        await import("@stores/wordList.ts");
      $showWordListFilterFlyout.set(true);
      $toggleWordListFilterFlyout();
      expect($showWordListFilterFlyout.get()).toBe(false);
    });
  });

  describe("setLetterFilter", () => {
    it("sets the activeLetterFilter", async () => {
      const { $wordSearch, setLetterFilter } = await import("@stores/wordList.ts");
      setLetterFilter("M");
      expect($wordSearch.get().activeLetterFilter).toBe("M");
    });

    it("calls trackEvent", async () => {
      const { setLetterFilter } = await import("@stores/wordList.ts");
      const { trackEvent } = await import("@utils/analytics");
      setLetterFilter("K");
      expect(trackEvent).toHaveBeenCalledWith("WordList", "Filter", "Letter: K");
    });
  });

  describe("$setSortOrder", () => {
    it("sets category and order", async () => {
      const { $wordSearch, $setSortOrder } = await import("@stores/wordList.ts");
      $setSortOrder("date", "dateOrder", "DESC");
      expect($wordSearch.get().activeOrderCategory).toBe("date");
      expect($wordSearch.get().dateOrder).toBe("DESC");
    });

    it("calls trackEvent", async () => {
      const { $setSortOrder } = await import("@stores/wordList.ts");
      const { trackEvent } = await import("@utils/analytics");
      $setSortOrder("alphabetical", "alphabeticalOrder", "ASC");
      expect(trackEvent).toHaveBeenCalledWith("WordList", "Sort Order", "alphabetical: ASC");
    });
  });

  describe("$searchMeta", () => {
    afterEach(() => {
      globalThis.fetch = defaultFetch;
    });

    it("is not part of the persisted $wordSearch map", async () => {
      const { $wordSearch } = await import("@stores/wordList.ts");
      const state = $wordSearch.get() as Record<string, unknown>;
      for (const key of ["letterGroups", "rangeFilterMinMax", "themen", "wordTypes"]) {
        expect(state).not.toHaveProperty(key);
      }
    });

    it("loads meta.json on first subscriber and maps availableWordGroups → letterGroups", async () => {
      const meta = {
        availableWordGroups: ["B", "S"],
        rangeFilterMinMax: { characterLength: { max: 20, min: 1 } },
        themen: [{ name: "Essen & Trinken", slug: "essen-trinken" }],
        wordTypes: ["Nomen", "Verb"],
      };
      const fetchSpy = vi.fn(() =>
        Promise.resolve({ json: () => Promise.resolve(meta), ok: true }),
      );
      globalThis.fetch = fetchSpy as unknown as typeof fetch;
      const { $searchMeta } = await import("@stores/wordList.ts");
      const unsub = $searchMeta.subscribe(() => {});
      await vi.waitFor(() => {
        expect($searchMeta.get().letterGroups).toEqual(["B", "S"]);
      });
      expect($searchMeta.get()).toEqual({
        letterGroups: meta.availableWordGroups,
        rangeFilterMinMax: meta.rangeFilterMinMax,
        themen: meta.themen,
        wordTypes: meta.wordTypes,
      });
      expect(fetchSpy).toHaveBeenCalledWith("/api/search/meta.json");
      unsub();
    });

    it.each([
      ["network failure", () => Promise.reject(new Error("network error"))],
      ["non-ok response", () => Promise.resolve({ json: vi.fn(), ok: false, status: 500 })],
    ])("logs an error on %s and keeps empty defaults", async (_label, impl) => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      globalThis.fetch = vi.fn(impl) as unknown as typeof fetch;
      const { $searchMeta } = await import("@stores/wordList.ts");
      const unsub = $searchMeta.subscribe(() => {});
      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "[wordList] Failed to load search meta:",
          expect.any(Error),
        );
      });
      expect($searchMeta.get().letterGroups).toEqual([]);
      unsub();
    });
  });

  describe("$searchResultCount", () => {
    it("returns 0 when oramaSearchResults state is not ready", async () => {
      const { $oramaSearchResults, $searchResultCount } = await import("@stores/wordList.ts");
      setOramaResults($oramaSearchResults, { state: "loading" });
      expect($searchResultCount.get()).toBe(0);
    });

    it("returns count when state is ready", async () => {
      const { $oramaSearchResults, $searchResultCount } = await import("@stores/wordList.ts");
      setOramaResults($oramaSearchResults, { state: "ready", value: { count: 42 } });
      expect($searchResultCount.get()).toBe(42);
    });

    it("returns 0 when state is ready but value has no count", async () => {
      const { $oramaSearchResults, $searchResultCount } = await import("@stores/wordList.ts");
      setOramaResults($oramaSearchResults, { state: "ready", value: null });
      expect($searchResultCount.get()).toBe(0);
    });
  });

  describe("$searchState", () => {
    it("returns loading while oramaSearchResults is loading", async () => {
      const { $oramaSearchResults, $searchState } = await import("@stores/wordList.ts");
      setOramaResults($oramaSearchResults, { state: "loading" });
      expect($searchState.get()).toBe("loading");
    });

    it("returns ready when oramaSearchResults is ready", async () => {
      const { $oramaSearchResults, $searchState } = await import("@stores/wordList.ts");
      setOramaResults($oramaSearchResults, { state: "ready", value: { count: 1 } });
      expect($searchState.get()).toBe("ready");
    });

    it("returns failed when oramaSearchResults failed", async () => {
      const { $oramaSearchResults, $searchState } = await import("@stores/wordList.ts");
      setOramaResults($oramaSearchResults, { error: new Error("boom"), state: "failed" });
      expect($searchState.get()).toBe("failed");
    });
  });

  describe("$oramaSearchResults computedAsync callback", () => {
    it("returns null when db is falsy after initOrama (covers line 433 false branch and line 424 ?? 10)", async () => {
      // Import triggers computedAsync mock which captures the callback
      const { $wordSearch } = await import("@stores/wordList.ts");
      expect(capturedCbRef.fn).toBeDefined();
      // fetch mock returns a non-array object → resultLimit = undefined → limit falls through to ?? 10
      // create mock returns undefined → db stays falsy → returns null (line 433 false branch)
      const result = await capturedCbRef.fn!($wordSearch.get());
      expect(result).toBeNull();
    });

    it("calls search when db is truthy (covers line 433 true branch)", async () => {
      const { create, search } = await import("@orama/orama");
      vi.mocked(create).mockResolvedValueOnce({ _orama: true } as unknown as never);
      vi.mocked(search).mockResolvedValueOnce({
        count: 0,
        elapsed: { formatted: "0", raw: 0 },
        hits: [],
      } as unknown as never);
      const { $wordSearch } = await import("@stores/wordList.ts");
      expect(capturedCbRef.fn).toBeDefined();
      const result = await capturedCbRef.fn!($wordSearch.get());
      expect(search).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it.each([
      ["alphabetical", "alphabeticalOrder", "wordProperties.berlinerisch"],
      ["date", "dateOrder", "dateTs"],
      ["modifiedDate", "modifiedDateOrder", "modifiedTs"],
    ] as const)("sorts %s via Orama property sort", async (category, orderKey, property) => {
      const { create, search } = await import("@orama/orama");
      vi.mocked(create).mockReturnValueOnce({ _orama: true } as unknown as never);
      vi.mocked(search).mockResolvedValueOnce({ count: 0, hits: [] } as unknown as never);
      const { $wordSearch } = await import("@stores/wordList.ts");
      await capturedCbRef.fn!(
        { ...$wordSearch.get(), activeOrderCategory: category, [orderKey]: "DESC" },
        "",
      );
      expect(vi.mocked(search).mock.calls.at(-1)?.[1]).toMatchObject({
        sortBy: { order: "DESC", property },
      });
    });

    it("builds where clauses for boolean, range, letter, word type and themen filters", async () => {
      const { create, search } = await import("@orama/orama");
      vi.mocked(create).mockReturnValueOnce({ _orama: true } as unknown as never);
      vi.mocked(search).mockResolvedValueOnce({ count: 0, hits: [] } as unknown as never);
      const { $wordSearch } = await import("@stores/wordList.ts");
      await capturedCbRef.fn!(
        {
          ...$wordSearch.get(),
          activeLetterFilter: "B",
          activeThemenFilter: ["essen-trinken"],
          activeWordTypeFilter: ["Verb"],
          audioExamples: true,
          berolinismus: true,
          characterCount: 4,
          syllablesCount: 0,
        },
        "",
      );
      expect(vi.mocked(search).mock.calls.at(-1)?.[1].where).toEqual({
        berlinerischWordTypes: { containsAny: ["Verb"] },
        themen: { containsAny: ["essen-trinken"] },
        wordGroup: { eq: "B" },
        "wordProperties.audioExamples": true,
        "wordProperties.berolinismus": true,
        "wordProperties.characterLength": { gte: 4 },
        "wordProperties.syllablesCount": { gte: 0 },
      });
    });

    it("omits where entirely when no filter is active", async () => {
      const { create, search } = await import("@orama/orama");
      vi.mocked(create).mockReturnValueOnce({ _orama: true } as unknown as never);
      vi.mocked(search).mockResolvedValueOnce({ count: 0, hits: [] } as unknown as never);
      const { $wordSearch } = await import("@stores/wordList.ts");
      await capturedCbRef.fn!($wordSearch.get(), "");
      expect(vi.mocked(search).mock.calls.at(-1)?.[1]).not.toHaveProperty("where");
    });

    it("fetches the search index only once for concurrent computations (single-flight)", async () => {
      const fetchSpy = vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]), ok: true }));
      globalThis.fetch = fetchSpy as unknown as typeof fetch;
      const { $wordSearch } = await import("@stores/wordList.ts");
      await Promise.all([
        capturedCbRef.fn!($wordSearch.get()),
        capturedCbRef.fn!($wordSearch.get()),
      ]);
      const indexCalls = fetchSpy.mock.calls.filter(([url]) => url === "/api/search/index.json");
      expect(indexCalls).toHaveLength(1);
    });

    it("throws on fetch failure so computedAsync reports state failed, then retries", async () => {
      globalThis.fetch = vi.fn(() =>
        Promise.resolve({ ok: false, status: 500 }),
      ) as unknown as typeof fetch;
      const { $wordSearch } = await import("@stores/wordList.ts");
      await expect(capturedCbRef.fn!($wordSearch.get())).rejects.toThrow(
        "[searchIndex] search index fetch failed: 500",
      );

      // Failure clears the memoized init promise → the next computation retries.
      const retryFetch = vi.fn(() =>
        Promise.resolve({ json: () => Promise.resolve([]), ok: true }),
      );
      globalThis.fetch = retryFetch as unknown as typeof fetch;
      const result = await capturedCbRef.fn!($wordSearch.get());
      expect(retryFetch).toHaveBeenCalledWith("/api/search/index.json");
      expect(result).toBeNull(); // create mock returns undefined → db falsy → null

      // restore fetch mock
      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({ availableWordGroups: [], rangeFilterMinMax: {}, wordTypes: [] }),
          ok: true,
        }),
      ) as unknown as typeof fetch;
    });
  });
});
