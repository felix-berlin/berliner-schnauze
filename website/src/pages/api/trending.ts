import type { APIRoute } from "astro";

import { getPayloadClient, siteRead } from "@services/payload.ts";
import { toWordRef } from "@services/payload/wordRefs.ts";
import { positiveInt, reply } from "@utils/apiReply.ts";
import { TREND_TYPES, trending, type TrendType } from "payload-app/word-stats";

const TTL = 5 * 60_000;
const TYPES: readonly string[] = TREND_TYPES;
const MAX_LIMIT = 50;

// shortcut: per process; with several web containers use a shared cache
const cache = new Map<string, { at: number; items: unknown }>();

const inRange = (n: number | undefined, max: number): n is number => n !== undefined && n <= max;

export const GET: APIRoute = async ({ url }) => {
  const type = url.searchParams.get("type") ?? "";
  const days = positiveInt(url.searchParams.get("days"), 30);
  const limit = positiveInt(url.searchParams.get("limit"), 10);
  if (!TYPES.includes(type) || !inRange(days, 365) || !inRange(limit, MAX_LIMIT))
    return reply({ error: "Ungültige Parameter" }, 400);

  // `limit` is not part of the key: the top MAX_LIMIT is cached and cut per request.
  const key = `${type}:${days}`;
  const now = Date.now();
  let hit = cache.get(key);
  if (!hit || now - hit.at >= TTL) {
    try {
      const payload = await getPayloadClient();
      const ranked = await trending(payload, { days, limit: MAX_LIMIT, type: type as TrendType });
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
        console.warn(`[trending] ${key}: ${ranked.length - byId.size} ranked words no longer visible`);
      const items = ranked
        .filter((r) => byId.has(r.word))
        .map((r, i) => ({
          previous: r.previous,
          rank: i + 1,
          value: r.value,
          views: r.views,
          word: toWordRef(byId.get(r.word) as Parameters<typeof toWordRef>[0]),
        }));
      for (const [k, v] of cache) if (now - v.at >= TTL) cache.delete(k);
      cache.set(key, (hit = { at: now, items }));
    } catch (error) {
      console.error(`[trending] ${key} failed:`, error);
      return reply({ error: "Die Liste konnte leider nicht jeladen werden." }, 502);
    }
  }
  return Response.json({ items: (hit.items as unknown[]).slice(0, limit) }, { headers: { "Cache-Control": "public, max-age=300" } });
};
