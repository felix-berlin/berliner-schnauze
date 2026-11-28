import type { RankedHit, SearchEntry } from "@lib/search/types";

import { sortHits } from "@lib/search/sort";
import { describe, expect, it } from "vitest";

const hit = (name: string, extra: Partial<SearchEntry> = {}): RankedHit => ({
  entry: {
    dateTs: 0,
    slug: name,
    wordGroup: name[0]!.toUpperCase(),
    wordProperties: { berlinerisch: name },
    ...extra,
  } as SearchEntry,
  tier: 0,
});
const names = (hs: RankedHit[]) => hs.map((h) => h.entry.slug);
const ctx = { trendRanks: new Map<string, number>() };

describe("sortHits", () => {
  it("jesagt puts thin words last", () => {
    const hs = [
      hit("b", { usage: { say: 0.9, votes: 9 } }),
      hit("c", { usage: { say: 0.3, votes: 10 } }),
      hit("a"),
      hit("d", { usage: { say: 0.8, votes: 10 } }),
    ];
    expect(names(sortHits(hs, "jesagt", ctx))).toEqual(["d", "c", "a", "b"]);
  });

  it("beliebt ranks top 50 then A-Z", () => {
    const hs = [hit("a"), hit("b"), hit("c"), hit("d")];
    const trendRanks = new Map([
      ["c", 0],
      ["b", 1],
    ]);
    expect(names(sortHits(hs, "beliebt", { trendRanks }))).toEqual(["c", "b", "a", "d"]);
    expect(names(sortHits(hs, "beliebt", ctx))).toEqual(["a", "b", "c", "d"]);
  });

  it("neu by dateTs desc, az with de locale", () => {
    const hs = [hit("b", { dateTs: 1 }), hit("Ä", { dateTs: 3 }), hit("a", { dateTs: 2 })];
    expect(names(sortHits(hs, "neu", ctx))).toEqual(["Ä", "a", "b"]);
    expect(names(sortHits(hs, "az", ctx))).toEqual(["a", "Ä", "b"]);
  });

  it("az keeps each letter group together in register order", () => {
    const hs = [hit("Afrika"), hit("Äffchen"), hit("Bude"), hit("Affe")];
    expect(names(sortHits(hs, "az", ctx))).toEqual(["Affe", "Afrika", "Äffchen", "Bude"]);
  });
});
