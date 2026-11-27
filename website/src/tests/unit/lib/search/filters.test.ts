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
    form?: Partial<SearchEntry["form"]>;
    theme?: string;
    group?: string;
    bero?: boolean;
  } = {},
) =>
  ({
    berlinerischWordTypes: [o.pos ?? "nomen"],
    form: { length: 6, soundex: "", syllables: 2, ...o.form },
    has: {
      examples: false,
      examplesAudio: false,
      facts: false,
      gap: !!o.gap,
      images: !!o.images,
      stories: false,
    },
    slug: o.name ?? "x",
    themen: o.theme ? [o.theme] : [],
    usage: o.usage,
    wordGroup: o.group ?? "A",
    wordProperties: {
      audioBerlinerisch: !!o.audio,
      berlinerisch: o.name ?? "x",
      berolinismus: !!o.bero,
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

  const both: Usage = {
    ages: { "30-49": { say: 0.9, votes: 9 }, u30: { say: 0.9, votes: 10 } },
    areas: { pankow: { say: 0.9, votes: 10 } },
    east: 0.7,
    say: 0.5,
    votes: 20,
    west: 0.4,
  };
  it.each([
    ["age alone ok", make({ usage: both }), { age: "u30" }, true],
    ["age alone thin", make({ usage: both }), { age: "30-49" }, false],
    ["area+age both ok", make({ usage: both }), { age: "u30", area: "pankow" }, true],
    ["area+age age thin", make({ usage: both }), { age: "30-49", area: "pankow" }, false],
    ["where ost", make({ usage: both }), { where: "ost" }, true],
    ["where west", make({ usage: both }), { where: "west" }, false],
    ["where no usage", make(), { where: "ost" }, false],
    ["kurz 5", make({ form: { length: 5 } }), { length: "kurz" }, true],
    ["mittel 6", make({ form: { length: 6 } }), { length: "mittel" }, true],
    ["kurz 6", make({ form: { length: 6 } }), { length: "kurz" }, false],
    ["mittel 10", make({ form: { length: 10 } }), { length: "mittel" }, true],
    ["lang 11", make({ form: { length: 11 } }), { length: "lang" }, true],
    ["mittel 11", make({ form: { length: 11 } }), { length: "mittel" }, false],
    ["silben 4 is 4+", make({ form: { syllables: 6 } }), { syllables: 4 }, true],
    ["silben 3 exact", make({ form: { syllables: 4 } }), { syllables: 3 }, false],
    ["letter", make({ group: "B" }), { letter: "b" }, true],
    ["letter miss", make({ group: "B" }), { letter: "a" }, false],
    ["starts", make({ name: "Brötchen" }), { starts: "brö" }, true],
    ["ends", make({ name: "Brötchen" }), { ends: "chen" }, true],
    ["ends miss", make({ name: "Brötchen" }), { ends: "brö" }, false],
    ["rhyme", make({ name: "Brötchen" }), { rhyme: "Mädchen" }, true],
    ["rhyme miss", make({ name: "Brötchen" }), { rhyme: "Hund" }, false],
    ["themes", make({ theme: "essen" }), { themes: ["essen", "x"] }, true],
    ["themes miss", make({ theme: "essen" }), { themes: ["x"] }, false],
    ["berolinismus", make({ bero: true }), { berolinismus: true }, true],
    ["berolinismus miss", make(), { berolinismus: true }, false],
  ] as const)("%s", (_n, entry, o, expected) => {
    expect(matches(entry, state(o as Partial<typeof EMPTY_STATE>))).toBe(expected);
  });

  it("facets letters count ignores the letter filter", () => {
    const entries = [make({ group: "A" }), make({ group: "B" }), make({ group: "B" })];
    const f = facets(entries, state({ letter: "a" }));
    expect(f.letters).toEqual({ A: 1, B: 2 });
    expect(f.total).toBe(1);
  });

  it("counts chips", () => {
    expect(activeFilterCount(state({ letter: "a", pos: ["verb", "nomen"] }))).toBe(3);
    expect(isFiltered(state({ q: "x", sort: "az" }))).toBe(false);
    expect(effectiveSort(state({ q: "x" }))).toBe("beste");
    expect(effectiveSort(EMPTY_STATE)).toBe("az");
    expect(effectiveSort(state({ sort: "beste" }))).toBe("az");
    expect(effectiveSort(state({ q: "x", sort: "neu" }))).toBe("neu");
  });
});
