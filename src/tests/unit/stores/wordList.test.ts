import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nanostores/persistent", () => ({
  persistentMap: vi.fn((key: string, initial: unknown) => {
    const { map } = require("nanostores");
    return map(initial);
  }),
}));

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@utils/helpers.ts", () => ({
  useViewTransition: vi.fn((fn: () => void) => fn()),
}));

vi.mock("@nanostores/async", () => ({
  computedAsync: vi.fn(() => {
    const { atom } = require("nanostores");
    return atom(null);
  }),
}));

vi.mock("@orama/orama", () => ({
  create: vi.fn(),
  insertMultiple: vi.fn(),
}));

vi.mock("@orama/plugin-match-highlight", () => ({
  afterInsert: vi.fn(),
  searchWithHighlight: vi.fn(),
}));

vi.mock("@orama/stemmers/german", () => ({
  language: "german",
  stemmer: vi.fn(),
}));

globalThis.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ availableWordGroups: [], wordTypes: [], rangeFilterMinMax: {} }),
  }),
) as unknown as typeof fetch;

describe("wordList store", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("$wordSearch default state", () => {
    it("has correct default values", async () => {
      const { $wordSearch } = await import("@stores/wordList.ts");
      const state = $wordSearch.get();
      expect(state.activeLetterFilter).toBe("");
      expect(state.activeOrderCategory).toBe("alphabetical");
      expect(state.activeWordTypeFilter).toEqual([]);
      expect(state.alphabeticalOrder).toBe("ASC");
      expect(state.berolinismus).toBe(false);
      expect(state.search).toBe("");
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
  });

  describe("resetAll", () => {
    it("resets all filters to defaults", async () => {
      const { $wordSearch, resetAll } = await import("@stores/wordList.ts");
      $wordSearch.setKey("activeLetterFilter", "Z");
      $wordSearch.setKey("berolinismus", true);
      $wordSearch.setKey("search", "test");
      $wordSearch.setKey("activeWordTypeFilter", ["Verb"]);

      resetAll();

      const state = $wordSearch.get();
      expect(state.activeLetterFilter).toBe("");
      expect(state.berolinismus).toBe(false);
      expect(state.search).toBe("");
      expect(state.activeWordTypeFilter).toEqual([]);
      expect(state.alphabeticalOrder).toBe("ASC");
      expect(state.dateOrder).toBe("ASC");
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
      const { $showWordListFilterFlyout, $toggleWordListFilterFlyout } = await import(
        "@stores/wordList.ts"
      );
      $showWordListFilterFlyout.set(false);
      $toggleWordListFilterFlyout();
      expect($showWordListFilterFlyout.get()).toBe(true);
    });

    it("toggles from true to false", async () => {
      const { $showWordListFilterFlyout, $toggleWordListFilterFlyout } = await import(
        "@stores/wordList.ts"
      );
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

  describe("setWordTypeFilter", () => {
    it("adds a word type when not present", async () => {
      const { $wordSearch, setWordTypeFilter } = await import("@stores/wordList.ts");
      $wordSearch.setKey("activeWordTypeFilter", []);
      setWordTypeFilter("Verb");
      expect($wordSearch.get().activeWordTypeFilter).toContain("Verb");
    });

    it("removes a word type when already present", async () => {
      const { $wordSearch, setWordTypeFilter } = await import("@stores/wordList.ts");
      $wordSearch.setKey("activeWordTypeFilter", ["Verb"]);
      setWordTypeFilter("Verb");
      expect($wordSearch.get().activeWordTypeFilter).not.toContain("Verb");
    });

    it("keeps other word types when toggling one", async () => {
      const { $wordSearch, setWordTypeFilter } = await import("@stores/wordList.ts");
      $wordSearch.setKey("activeWordTypeFilter", ["Verb", "Substantiv"]);
      setWordTypeFilter("Verb");
      expect($wordSearch.get().activeWordTypeFilter).toEqual(["Substantiv"]);
    });
  });

  describe("setActiveOrderCategory", () => {
    it("sets the activeOrderCategory", async () => {
      const { $wordSearch, setActiveOrderCategory } = await import("@stores/wordList.ts");
      setActiveOrderCategory("date");
      expect($wordSearch.get().activeOrderCategory).toBe("date");
    });

    it("sets to modifiedDate", async () => {
      const { $wordSearch, setActiveOrderCategory } = await import("@stores/wordList.ts");
      setActiveOrderCategory("modifiedDate");
      expect($wordSearch.get().activeOrderCategory).toBe("modifiedDate");
    });
  });

  describe("$alphabeticalOrderToggle", () => {
    it("toggles from ASC to DESC", async () => {
      const { $wordSearch, $alphabeticalOrderToggle } = await import("@stores/wordList.ts");
      $wordSearch.setKey("alphabeticalOrder", "ASC");
      $alphabeticalOrderToggle();
      expect($wordSearch.get().alphabeticalOrder).toBe("DESC");
    });

    it("toggles from DESC to ASC", async () => {
      const { $wordSearch, $alphabeticalOrderToggle } = await import("@stores/wordList.ts");
      $wordSearch.setKey("alphabeticalOrder", "DESC");
      $alphabeticalOrderToggle();
      expect($wordSearch.get().alphabeticalOrder).toBe("ASC");
    });
  });

  describe("$wordListDateOrderToggle", () => {
    it("toggles from ASC to DESC", async () => {
      const { $wordSearch, $wordListDateOrderToggle } = await import("@stores/wordList.ts");
      $wordSearch.setKey("dateOrder", "ASC");
      $wordListDateOrderToggle();
      expect($wordSearch.get().dateOrder).toBe("DESC");
    });

    it("toggles from DESC to ASC", async () => {
      const { $wordSearch, $wordListDateOrderToggle } = await import("@stores/wordList.ts");
      $wordSearch.setKey("dateOrder", "DESC");
      $wordListDateOrderToggle();
      expect($wordSearch.get().dateOrder).toBe("ASC");
    });
  });

  describe("$wordListModifiedDateOrderToggle", () => {
    it("toggles from ASC to DESC", async () => {
      const { $wordSearch, $wordListModifiedDateOrderToggle } = await import("@stores/wordList.ts");
      $wordSearch.setKey("modifiedDateOrder", "ASC");
      $wordListModifiedDateOrderToggle();
      expect($wordSearch.get().modifiedDateOrder).toBe("DESC");
    });

    it("toggles from DESC to ASC", async () => {
      const { $wordSearch, $wordListModifiedDateOrderToggle } = await import("@stores/wordList.ts");
      $wordSearch.setKey("modifiedDateOrder", "DESC");
      $wordListModifiedDateOrderToggle();
      expect($wordSearch.get().modifiedDateOrder).toBe("ASC");
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

  describe("setSearch", () => {
    it("sets the search string", async () => {
      const { $wordSearch, setSearch } = await import("@stores/wordList.ts");
      setSearch("Berliner");
      expect($wordSearch.get().search).toBe("Berliner");
    });

    it("can be set to empty string", async () => {
      const { $wordSearch, setSearch } = await import("@stores/wordList.ts");
      setSearch("foo");
      setSearch("");
      expect($wordSearch.get().search).toBe("");
    });
  });

  describe("$toggleBerolinismus", () => {
    it("toggles berolinismus from false to true", async () => {
      const { $wordSearch, $toggleBerolinismus } = await import("@stores/wordList.ts");
      $wordSearch.setKey("berolinismus", false);
      $toggleBerolinismus();
      expect($wordSearch.get().berolinismus).toBe(true);
    });

    it("toggles berolinismus from true to false", async () => {
      const { $wordSearch, $toggleBerolinismus } = await import("@stores/wordList.ts");
      $wordSearch.setKey("berolinismus", true);
      $toggleBerolinismus();
      expect($wordSearch.get().berolinismus).toBe(false);
    });

    it("calls trackEvent", async () => {
      const { $wordSearch, $toggleBerolinismus } = await import("@stores/wordList.ts");
      const { trackEvent } = await import("@utils/analytics");
      $wordSearch.setKey("berolinismus", false);
      $toggleBerolinismus();
      expect(trackEvent).toHaveBeenCalledWith(
        "WordList",
        "Filter",
        expect.stringContaining("Berolinismus"),
      );
    });
  });

  describe("searchLength", () => {
    it("returns 0 when search is empty", async () => {
      const { $wordSearch, searchLength } = await import("@stores/wordList.ts");
      $wordSearch.setKey("search", "");
      expect(searchLength.get()).toBe(0);
    });

    it("returns the length of the search string", async () => {
      const { $wordSearch, searchLength } = await import("@stores/wordList.ts");
      $wordSearch.setKey("search", "Berlin");
      expect(searchLength.get()).toBe(6);
    });
  });
});
