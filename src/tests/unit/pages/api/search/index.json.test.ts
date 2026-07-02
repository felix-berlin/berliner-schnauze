import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({
  SHOW_TEST_DATA: false,
  WP_API: "http://test.local/graphql",
  WP_REST_API: "http://test.local/wp-json",
}));
vi.mock("astro:env/server", () => ({ WP_AUTH_PASS: "test", WP_AUTH_USER: "test" }));

import { makeOramaSearchIndex } from "@/pages/api/search/index.json.ts";
import type { BerlinerWord } from "@/gql/entity-types";

function makeWord(overrides: Partial<BerlinerWord> = {}): BerlinerWord {
  return {
    berlinerischThemen: null,
    berlinerischWordTypes: null,
    berlinerWordId: 1,
    dateGmt: "2025-01-01T00:00:00",
    id: "1",
    modifiedGmt: "2025-01-01T00:00:00",
    seo: null,
    slug: "wat",
    title: "Wat",
    wordGroup: "",
    wordProperties: {
      alternativeWords: null,
      article: null,
      berlinerisch: "wat",
      berlinerischAudio: null,
      berolinismus: false,
      examples: null,
      images: null,
      infoText: null,
      learnMore: null,
      relatedWords: null,
      translations: null,
      wikimediaFiles: null,
    },
    ...overrides,
  } as unknown as BerlinerWord;
}

describe("makeOramaSearchIndex — themen extraction", () => {
  it("returns empty themen array when berlinerischThemen is null", () => {
    const result = makeOramaSearchIndex(makeWord({ berlinerischThemen: null }), new Map());
    expect(result.themen).toEqual([]);
  });

  it("extracts slugs and filters out null slugs", () => {
    const result = makeOramaSearchIndex(
      makeWord({
        berlinerischThemen: {
          nodes: [
            { name: "Essen", slug: "essen-trinken" },
            { name: "Ohne Slug", slug: null },
          ],
        },
      } as unknown as Partial<BerlinerWord>),
      new Map(),
    );
    expect(result.themen).toEqual(["essen-trinken"]);
  });

  it("does not throw when nodes is null", () => {
    const result = makeOramaSearchIndex(
      makeWord({ berlinerischThemen: { nodes: null } } as unknown as Partial<BerlinerWord>),
      new Map(),
    );
    expect(result.themen).toEqual([]);
  });
});
