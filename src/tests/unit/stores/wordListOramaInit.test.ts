/**
 * Regression test for the cold-start "ready + 0 results" flash.
 *
 * @orama/plugin-match-highlight registers an async afterInsert hook, but
 * Orama's insertMultiple picks its synchronous path (its asyncNeeded check
 * ignores plugin-level afterInsert), so the hook runs fire-and-forget and
 * the positions store fills in AFTER insertMultiple resolves. Searching in
 * that window returns 0 hits. initOrama must therefore drain the hook queue
 * before the store reports its first "ready" state.
 *
 * Uses the real Orama stack on purpose — mocking it would hide the race.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@utils/helpers.ts", () => ({
  useViewTransition: vi.fn((fn: () => void) => fn()),
}));

const makeWord = (berlinerisch: string, slug: string) => ({
  berlinerWordId: slug,
  berlinerischWordTypes: [],
  dateGmt: "2026-01-01T00:00:00",
  dateTs: 1_767_225_600_000,
  modifiedGmt: "2026-01-01T00:00:00",
  modifiedTs: 1_767_225_600_000,
  slug,
  themen: [],
  wordComponents: [],
  wordGroup: berlinerisch[0].toUpperCase(),
  wordProperties: {
    audioBerlinerisch: false,
    audioExamples: false,
    berlinerisch,
    berolinismus: false,
    characterLength: berlinerisch.length,
    consonantsCount: 3,
    multipleMeanings: false,
    similarSoundingWords: false,
    syllablesCount: 2,
    translations: ["übersetzung"],
    vowelsCount: 2,
  },
});

const searchIndex = [
  makeWord("aalen", "aalen"),
  makeWord("bammeln", "bammeln"),
  makeWord("cottbusser", "cottbusser"),
];

const meta = {
  availableWordGroups: ["A", "B", "C"],
  rangeFilterMinMax: {
    characterLength: { max: 12, min: 2 },
    consonantsCount: { max: 8, min: 1 },
    syllablesCount: { max: 5, min: 1 },
    vowelsCount: { max: 6, min: 1 },
  },
  themen: [],
  wordTypes: [],
};

describe("wordList store Orama init (real Orama, no mocks)", () => {
  it("never reports ready with 0 hits on cold start (highlight hook race)", async () => {
    globalThis.fetch = vi.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes("meta.json")) {
        return { json: async () => meta, ok: true } as Response;
      }
      if (u.includes("index.json")) {
        return { json: async () => searchIndex, ok: true } as Response;
      }
      throw new Error(`unexpected fetch ${u}`);
    }) as unknown as typeof fetch;

    const { $oramaSearchResults, $wordSearch } = await import("@stores/wordList.ts");

    const readyCounts: (number | undefined)[] = [];
    const unsubResults = $oramaSearchResults.subscribe((result) => {
      if (result?.state === "ready") {
        readyCounts.push((result.value as { count?: number } | null)?.count);
      }
    });
    const unsubSearch = $wordSearch.subscribe(() => {});

    await vi.waitFor(
      () => {
        expect(readyCounts.length).toBeGreaterThan(0);
      },
      { interval: 20, timeout: 15_000 },
    );
    // settle window: catch any late overwrites from concurrent computations
    await new Promise((resolve) => setTimeout(resolve, 300));

    unsubResults();
    unsubSearch();

    // Every ready state ever emitted must contain the full result set —
    // a single intermediate 0 is the flash regression this test guards.
    expect(readyCounts.length).toBeGreaterThan(0);
    for (const count of readyCounts) {
      expect(count).toBe(searchIndex.length);
    }
  }, 30_000);
});
