import type { RankedHit, SortKey } from "./types";

import { MIN_VOTES } from "./usage";

const name = (h: RankedHit) => h.entry.wordProperties.berlinerisch;
const az = (a: RankedHit, b: RankedHit) => name(a).localeCompare(name(b), "de");

/** Stable, returns a copy. "beste" keeps the incoming (ranked) order. */
export function sortHits(
  hits: RankedHit[],
  sort: SortKey,
  ctx: { trendRanks: Map<string, number> },
): RankedHit[] {
  const out = [...hits];
  // Thin words (< MIN_VOTES) get -1 and sort after every real share; no share shows as 0 %.
  const say = (h: RankedHit) =>
    h.entry.usage && h.entry.usage.votes >= MIN_VOTES ? h.entry.usage.say : -1;
  const rank = (h: RankedHit) => ctx.trendRanks.get(h.entry.slug) ?? Infinity;
  switch (sort) {
    case "az":
      return out.sort(az);
    case "neu":
      return out.sort((a, b) => b.entry.dateTs - a.entry.dateTs || az(a, b));
    case "jesagt":
      return out.sort((a, b) => say(b) - say(a) || az(a, b));
    case "beliebt":
      return out.sort((a, b) => (rank(a) === rank(b) ? az(a, b) : rank(a) < rank(b) ? -1 : 1));
    default:
      return out;
  }
}
