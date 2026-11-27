import { ttl } from "@services/cache.ts";
import { getPayloadClient, siteRead } from "@services/payload.ts";
import { toWordRef } from "@services/payload/wordRefs.ts";
import { TREND_TYPES, trending, type TrendType } from "payload-app/word-stats";

const TTL = 5 * 60_000;
export const MAX_LIMIT = 50;
export const TREND_WINDOWS = [7, 30, 365];

const load = async (type: TrendType, days: number) => {
  const payload = await getPayloadClient();
  const ranked = await trending(payload, { days, limit: MAX_LIMIT, type });
  const { docs } = await payload.find({
    collection: "words",
    depth: 0,
    limit: 0,
    pagination: false,
    select: { berlinerisch: true, slug: true },
    where: { id: { in: ranked.map((r) => r.word) } },
    ...siteRead(),
  });
  const byId = new Map(docs.map((d) => [d.id, d]));
  if (byId.size < ranked.length)
    console.warn(
      `[trending] ${type}:${days}: ${ranked.length - byId.size} ranked words no longer visible`,
    );
  return ranked
    .filter((r) => byId.has(r.word))
    .map((r, i) => ({
      previous: r.previous,
      rank: i + 1,
      value: r.value,
      views: r.views,
      word: toWordRef(byId.get(r.word) as Parameters<typeof toWordRef>[0]),
    }));
};

// shortcut: per process; with several web containers use a shared cache.
// `limit` is not part of the key: the top MAX_LIMIT is cached and cut per request.
export const trendingMemos = new Map(
  TREND_TYPES.flatMap((type) =>
    TREND_WINDOWS.map(
      (days) => [`${type}:${days}` as string, ttl(TTL, () => load(type, days))] as const,
    ),
  ),
);

/** slug → rank (1 = most viewed) of the top 50 over 7 days; empty when the data is unavailable. */
export const getTrendRanks = async (): Promise<Map<string, number>> => {
  try {
    const items = await trendingMemos.get("viewed:7")!();
    return new Map(items.map((i) => [i.word.slug, i.rank]));
  } catch (error) {
    console.error("[trending] ranks unavailable:", error);
    return new Map();
  }
};
