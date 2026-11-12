/**
 * $oramaSearchResults against the real Orama stack (only fetch, persistence and
 * analytics are mocked). Store-level logic with Orama mocked lives in
 * wordList.test.ts.
 */
import { map } from "nanostores";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── static fixtures ─────────────────────────────────────────────────────────

const metaResponse = {
  availableWordGroups: ["B", "S"],
  rangeFilterMinMax: {
    characterLength: { max: 20, min: 1 },
    consonantsCount: { max: 10, min: 0 },
    syllablesCount: { max: 5, min: 1 },
    vowelsCount: { max: 8, min: 0 },
  },
  themen: [
    { name: "Essen & Trinken", slug: "essen-trinken" },
    { name: "Alkohol & Kneipe", slug: "alkohol-kneipe" },
  ],
  wordTypes: ["Nomen", "Verb"],
};

const indexResponse = [
  {
    berlinerischWordTypes: ["Nomen"],
    dateTs: 1704067200,
    id: "1",
    modifiedTs: 1704153600,
    slug: "schnauze",
    themen: ["essen-trinken"],
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
      syllablesCount: 2,
      translations: ["Mund"],
      vowelsCount: 3,
    },
  },
  {
    berlinerischWordTypes: ["Verb"],
    dateTs: 1672531200,
    id: "2",
    modifiedTs: 1717200000,
    slug: "kieken",
    themen: ["alkohol-kneipe"],
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
      syllablesCount: 2,
      translations: ["schauen", "Mund"],
      vowelsCount: 3,
    },
  },
];

// ─── module mocks ─────────────────────────────────────────────────────────────

vi.mock("@nanostores/persistent", () => ({
  persistentMap: vi.fn((key: string, initial: unknown) => map(initial)),
}));

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@utils/viewTransition.ts", () => ({
  vt: vi.fn((fn: () => void) => fn()),
}));

// ─── setup ────────────────────────────────────────────────────────────────────

function makeFetch(overrides: Record<string, unknown> = {}) {
  return vi.fn().mockImplementation((url: string) => {
    if (url in overrides) return overrides[url];
    if (url === "/api/search/meta.json") {
      return Promise.resolve({ json: () => Promise.resolve(metaResponse), ok: true });
    }
    if (url === "/api/search/index.json") {
      return Promise.resolve({ json: () => Promise.resolve(indexResponse), ok: true });
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

  it("reports failed state when search index fetch fails", async () => {
    // Fetch/init errors propagate on purpose: computedAsync reports "failed"
    // so the error UI can prompt a reload.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { $oramaSearchResults } = await import("@stores/wordList.ts");
    await vi.waitFor(
      () => {
        expect($oramaSearchResults.get().state).toBe("failed");
      },
      { timeout: 5000 },
    );
  });

  it("reports failed state on non-ok search index response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: vi.fn(), ok: false, status: 503 }));
    const { $oramaSearchResults } = await import("@stores/wordList.ts");
    await vi.waitFor(
      () => {
        expect($oramaSearchResults.get().state).toBe("failed");
      },
      { timeout: 5000 },
    );
  });
});

// ─── buildWhere / getSortBy against the real Orama index ─────────────────────

describe("buildWhere — filter options", () => {
  it("all boolean and numeric filters produce ready state", async () => {
    const { $wordSearch, $oramaSearchResults } = await import("@stores/wordList.ts");
    $wordSearch.setKey("berolinismus", true);
    $wordSearch.setKey("audioBerlinerisch", true);
    $wordSearch.setKey("audioExamples", true);
    $wordSearch.setKey("multipleMeanings", true);
    $wordSearch.setKey("characterCount", 3);
    $wordSearch.setKey("consonantsCount", 2);
    $wordSearch.setKey("vowelsCount", 1);
    $wordSearch.setKey("syllablesCount", 1);
    $wordSearch.setKey("activeLetterFilter", "S");
    $wordSearch.setKey("activeWordTypeFilter", ["Nomen"]);
    $wordSearch.setKey("activeThemenFilter", ["essen-trinken"]);
    await vi.waitFor(
      () => {
        expect($oramaSearchResults.get().state).toBe("ready");
      },
      { timeout: 5000 },
    );
  });
});

describe("buildWhere — range and boolean filters", () => {
  it("range filters match with gte", async () => {
    const { $wordSearch, $oramaSearchResults } = await import("@stores/wordList.ts");
    $wordSearch.setKey("characterCount", 7);
    await vi.waitFor(
      () => {
        expect($oramaSearchResults.get().state).toBe("ready");
      },
      { timeout: 5000 },
    );
    const hits = $oramaSearchResults.get().value?.hits ?? [];
    expect(hits.map((h) => h.document.slug)).toEqual(["schnauze"]);
  });

  it("boolean filters match only true documents", async () => {
    const { $wordSearch, $oramaSearchResults } = await import("@stores/wordList.ts");
    $wordSearch.setKey("berolinismus", true);
    await vi.waitFor(
      () => {
        expect($oramaSearchResults.get().state).toBe("ready");
      },
      { timeout: 5000 },
    );
    expect($oramaSearchResults.get().value?.count).toBe(0);
  });
});

describe("buildWhere — themen filter", () => {
  it("filters results to only documents matching activeThemenFilter via where.themen", async () => {
    const { $wordSearch, $oramaSearchResults } = await import("@stores/wordList.ts");
    $wordSearch.setKey("activeThemenFilter", ["essen-trinken"]);
    await vi.waitFor(
      () => {
        expect($oramaSearchResults.get().state).toBe("ready");
      },
      { timeout: 5000 },
    );
    const hits = $oramaSearchResults.get().value?.hits ?? [];
    expect(hits.length).toBe(1);
    expect(hits[0].document.wordProperties.berlinerisch).toBe("Schnauze");
  });

  it("returns no results when activeThemenFilter matches no document", async () => {
    const { $wordSearch, $oramaSearchResults } = await import("@stores/wordList.ts");
    $wordSearch.setKey("activeThemenFilter", ["nicht-existent"]);
    await vi.waitFor(
      () => {
        expect($oramaSearchResults.get().state).toBe("ready");
      },
      { timeout: 5000 },
    );
    const hits = $oramaSearchResults.get().value?.hits ?? [];
    expect(hits.length).toBe(0);
  });
});

describe("getSortBy — sort orders", () => {
  // Both test documents contain "berlin" in wordComponents, so a search for it
  // yields 2 hits whose order is decided by the Orama property sort.

  it("date order (ASC) puts older dateTs first", async () => {
    const { $wordSearch, $oramaSearchResults, $searchQuery } = await import("@stores/wordList.ts");
    $wordSearch.setKey("activeOrderCategory", "date");
    $wordSearch.setKey("dateOrder", "ASC");
    $searchQuery.set("berlin");
    let hits: (typeof $oramaSearchResults.get.prototype)[] = [];
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
    const { $wordSearch, $oramaSearchResults, $searchQuery } = await import("@stores/wordList.ts");
    $wordSearch.setKey("activeOrderCategory", "date");
    $wordSearch.setKey("dateOrder", "DESC");
    $searchQuery.set("berlin");
    let hits: (typeof $oramaSearchResults.get.prototype)[] = [];
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
    const { $wordSearch, $oramaSearchResults, $searchQuery } = await import("@stores/wordList.ts");
    $wordSearch.setKey("activeOrderCategory", "modifiedDate");
    $wordSearch.setKey("modifiedDateOrder", "ASC");
    $searchQuery.set("berlin");
    let hits: (typeof $oramaSearchResults.get.prototype)[] = [];
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
    const { $wordSearch, $oramaSearchResults, $searchQuery } = await import("@stores/wordList.ts");
    $wordSearch.setKey("activeOrderCategory", "modifiedDate");
    $wordSearch.setKey("modifiedDateOrder", "DESC");
    $searchQuery.set("berlin");
    let hits: (typeof $oramaSearchResults.get.prototype)[] = [];
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

// ─── ranking and filters on real-world shapes ────────────────────────────────

/** Minimal index entry; `wordComponents` are the suffixes the server derives. */
const entry = (
  slug: string,
  berlinerisch: string,
  translations: string[],
  wordComponents: string[],
) => ({
  berlinerischWordTypes: ["Nomen"],
  dateTs: 1704067200,
  modifiedTs: 1704153600,
  slug,
  themen: [],
  wordComponents,
  wordGroup: berlinerisch[0].toUpperCase(),
  wordProperties: {
    audioBerlinerisch: false,
    audioExamples: false,
    berlinerisch,
    berolinismus: false,
    characterLength: berlinerisch.length,
    consonantsCount: 3,
    multipleMeanings: false,
    syllablesCount: 2,
    translations,
    vowelsCount: 2,
  },
});

// Reported on prod: "Mauken" was found, but alphabetically sorted behind 27 fuzzy hits.
const mixedIndex = [
  entry("asche", "Asche", ["Geld"], ["sche"]),
  entry("bumschekschek", "Bumschekschek", ["Musik mit Pauke und Becken"], ["schekschek", "schek"]),
  entry("mauke", "Mauke", ["Fuß", "übelriechende Füße"], ["auke"]),
  entry("mauken", "Mauken", ["furchtbar stinkende Füße"], ["auken", "uken"]),
  entry("nauke", "Nauke", ["Spottruf"], ["auke"]),
  entry("fusseln", "Fusseln", ["Flusen"], ["usseln", "sseln"]),
  entry("fussbad", "Fußbad", ["Bad für die Füße"], ["ußbad", "ßbad"]),
  entry("pauke", "Pauke", ["Trommel"], ["auke"]),
  entry("madig-machen", "madig machen", ["schlechtreden"], ["adig", "achen", "chen"]),
  entry("mantel", "Mantel, was nutzt mich der Mantel", ["Redensart"], ["antel", "ntel", "utzt"]),
];

const ready = async () => {
  const { $oramaSearchResults } = await import("@stores/wordList.ts");
  await vi.waitFor(() => expect($oramaSearchResults.get().status).toBe("ready"), {
    timeout: 5000,
  });
  return $oramaSearchResults.get().value?.hits.map((h) => h.document.slug) ?? [];
};

describe("search ranking and filters (real Orama)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      makeFetch({
        "/api/search/index.json": Promise.resolve({
          json: () => Promise.resolve(mixedIndex),
          ok: true,
        }),
      }),
    );
  });

  it("puts the exact word first by default while searching", async () => {
    const { $searchQuery } = await import("@stores/wordList.ts");
    $searchQuery.set("Mauken");
    await vi.waitFor(async () => expect((await ready())[0]).toBe("mauken"), { timeout: 5000 });
  });

  it("ranks the exact word first regardless of case and surrounding spaces", async () => {
    const { $searchQuery } = await import("@stores/wordList.ts");
    $searchQuery.set("  mauke ");
    await vi.waitFor(async () => expect((await ready())[0]).toBe("mauke"), { timeout: 5000 });
  });

  it("ranks words whose translation contains the term above fuzzy word matches", async () => {
    const { $searchQuery } = await import("@stores/wordList.ts");
    $searchQuery.set("Füße");
    await vi.waitFor(
      async () => {
        const slugs = await ready();
        expect(slugs.slice(0, 3).sort()).toEqual(["fussbad", "mauke", "mauken"]);
      },
      { timeout: 4000 },
    );
  });

  it("ranks a translation holding every word of a multi-word search first", async () => {
    const { $searchQuery } = await import("@stores/wordList.ts");
    $searchQuery.set("stinkende Füße");
    await vi.waitFor(async () => expect((await ready())[0]).toBe("mauken"), { timeout: 4000 });
  });

  it("keeps an explicitly chosen sort while searching", async () => {
    const { $searchQuery, $setSortOrder } = await import("@stores/wordList.ts");
    $setSortOrder("alphabetical", "DESC");
    $searchQuery.set("Mauken");
    await vi.waitFor(
      async () => {
        const slugs = await ready();
        expect(slugs.length).toBeGreaterThan(1);
        expect(slugs).toEqual([...slugs].sort((a, b) => b.localeCompare(a, "de")));
      },
      { timeout: 5000 },
    );
  });

  it("lists every word alphabetically without a search term", async () => {
    expect(await ready()).toEqual([
      "asche",
      "bumschekschek",
      "fussbad",
      "fusseln",
      "madig-machen",
      "mantel",
      "mauke",
      "mauken",
      "nauke",
      "pauke",
    ]);
  });
});
