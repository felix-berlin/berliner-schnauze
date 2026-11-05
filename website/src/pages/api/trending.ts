import type { APIRoute } from "astro";

import { getPayloadClient, siteRead } from "@services/payload.ts";
import { toWordRef } from "@services/payload/wordRefs.ts";
import { positiveInt, reply } from "@utils/apiReply.ts";
import { trending, type TrendType } from "payload-app/word-stats";

const TTL = 5 * 60_000;
const TYPES: readonly string[] = ["viewed", "rising", "engaged"] satisfies TrendType[];

// shortcut: per process; with several web containers use a shared cache
const cache = new Map<string, { at: number; items: unknown }>();

const inRange = (n: number | undefined, max: number): n is number => n !== undefined && n <= max;

export const GET: APIRoute = async ({ url }) => {
  const type = url.searchParams.get("type") ?? "";
  const days = positiveInt(url.searchParams.get("days"), 30);
  const limit = positiveInt(url.searchParams.get("limit"), 10);
  if (!TYPES.includes(type) || !inRange(days, 365) || !inRange(limit, 50))
    return reply({ error: "Ungültige Parameter" }, 400);

  const key = `${type}:${days}:${limit}`;
  const now = Date.now();
  let hit = cache.get(key);
  if (!hit || now - hit.at >= TTL) {
    try {
      const payload = await getPayloadClient();
      const ranked = await trending(payload, { days, limit, type: type as TrendType });
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
  return Response.json({ items: hit.items }, { headers: { "Cache-Control": "public, max-age=300" } });
};
