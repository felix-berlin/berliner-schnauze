import type { SearchEntry, Usage } from "@lib/search/types";

import { facets } from "@lib/search/facets";
import { matches } from "@lib/search/filters";
import { EMPTY_STATE, activeFilterCount, effectiveSort, isFiltered } from "@lib/search/state";
import { eastWest, oftenBucket } from "@lib/search/usage";
import { describe, expect, it } from "vitest";

const make = (
  o: {
    name?: string;
    pos?: string;
    audio?: boolean;
    images?: boolean;
    gap?: boolean;
    usage?: Usage;
  } = {},
) =>
  ({
    berlinerischWordTypes: [o.pos ?? "nomen"],
    form: { length: 6, soundex: "", syllables: 2 },
    has: {
      examples: false,
      examplesAudio: false,
      facts: false,
      gap: !!o.gap,
      images: !!o.images,
      stories: false,
    },
    slug: o.name ?? "x",
    themen: [],
    usage: o.usage,
    wordGroup: "A",
    wordProperties: {
      audioBerlinerisch: !!o.audio,
      berlinerisch: o.name ?? "x",
      berolinismus: false,
      translations: [],
    },
  }) as unknown as SearchEntry;

const state = (o: Partial<typeof EMPTY_STATE>) => ({ ...EMPTY_STATE, ...o });

describe("search filters", () => {
  it("or within group, and between groups", () => {
    const s = state({ content: ["audio"], pos: ["verb", "adjektiv"] });
    expect(matches(make({ audio: true, pos: "verb" }), s)).toBe(true);
    expect(matches(make({ pos: "adjektiv" }), s)).toBe(false);
    expect(matches(make({ audio: true, pos: "nomen" }), s)).toBe(false);
  });

  it("thresholds at the edges", () => {
    expect(oftenBucket(0.5)).toBe("oft");
    expect(oftenBucket(0.4999)).toBe("manchmal");
    expect(oftenBucket(0.2)).toBe("manchmal");
    expect(oftenBucket(0.1999)).toBe("kaum");
    expect(eastWest({ east: 0.61, say: 0, votes: 10, west: 0.5 })).toBe("ost");
    expect(eastWest({ east: 0.6, say: 0, votes: 10, west: 0.5 })).toBe("ost");
    expect(eastWest({ east: 0.55, say: 0, votes: 10, west: 0.5 })).toBe("beides");
    expect(eastWest({ east: 0.4, say: 0, votes: 10, west: 0.55 })).toBe("west");
  });

  it("under 10 votes never matches usage filters", () => {
    const s = state({ often: "oft" });
    expect(matches(make({ usage: { say: 0.9, votes: 9 } }), s)).toBe(false);
    expect(matches(make({ usage: { say: 0.9, votes: 10 } }), s)).toBe(true);
    expect(matches(make(), s)).toBe(false);
  });

  it("area narrows the population", () => {
    const usage: Usage = {
      areas: { mitte: { say: 0.9, votes: 9 }, pankow: { say: 0.9, votes: 10 } },
      say: 0.1,
      votes: 50,
    };
    expect(matches(make({ usage }), state({ area: "pankow", often: "oft" }))).toBe(true);
    expect(matches(make({ usage }), state({ area: "mitte", often: "oft" }))).toBe(false);
    expect(matches(make({ usage }), state({ area: "pankow" }))).toBe(true);
    expect(matches(make({ usage }), state({ area: "mitte" }))).toBe(false);
  });

  it("gap content key", () => {
    const s = state({ content: ["luecke"] });
    expect(matches(make({ gap: true }), s)).toBe(true);
    expect(matches(make(), s)).toBe(false);
  });

  it("facets ignore their own group", () => {
    const entries = [
      make({ audio: true, images: true, pos: "verb" }),
      make({ images: true, pos: "verb" }),
      make({ images: true, pos: "nomen" }),
    ];
    const f = facets(entries, state({ content: ["audio"], pos: ["verb"] }));
    expect(f.content.bilder).toBe(2);
    expect(f.content.audio).toBe(1);
    expect(f.total).toBe(1);
  });

  it("counts chips", () => {
    expect(activeFilterCount(state({ letter: "a", pos: ["verb", "nomen"] }))).toBe(3);
    expect(isFiltered(state({ q: "x", sort: "az" }))).toBe(false);
    expect(effectiveSort(state({ q: "x" }))).toBe("beste");
    expect(effectiveSort(EMPTY_STATE)).toBe("az");
  });
});
