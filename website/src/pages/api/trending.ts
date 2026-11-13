import type { APIRoute } from "astro";

import { ttl } from "@services/cache.ts";
import { getPayloadClient, siteRead } from "@services/payload.ts";
import { toWordRef } from "@services/payload/wordRefs.ts";
import { positiveInt, reply } from "@utils/apiReply.ts";
import { TREND_TYPES, trending, type TrendType } from "payload-app/word-stats";

const TTL = 5 * 60_000;
const MAX_LIMIT = 50;
const DAYS = [7, 30, 365];

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
const memos = new Map(
  TREND_TYPES.flatMap((type) =>
    DAYS.map((days) => [`${type}:${days}` as string, ttl(TTL, () => load(type, days))] as const),
  ),
);

export const GET: APIRoute = async ({ url }) => {
  const type = url.searchParams.get("type") ?? "";
  const days = positiveInt(url.searchParams.get("days"), 30);
  const limit = positiveInt(url.searchParams.get("limit"), 10);
  const key = `${type}:${days}`;
  const memo = memos.get(key);
  if (!memo || limit === undefined || limit > MAX_LIMIT)
    return reply({ error: "Ungültige Parameter" }, 400);

  try {
    const items = await memo();
    return Response.json(
      { items: items.slice(0, limit) },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch (error) {
    console.error(`[trending] ${key} failed:`, error);
    return reply({ error: "Die Liste konnte leider nicht jeladen werden." }, 502);
  }
};
