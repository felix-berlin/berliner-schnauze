import type { APIRoute } from "astro";

import { MAX_LIMIT, trendingMemos } from "@services/payload/trending.ts";
import { positiveInt, reply } from "@utils/apiReply.ts";
import { logRouteError } from "@utils/logError.ts";

export const GET: APIRoute = async ({ url }) => {
  const type = url.searchParams.get("type") ?? "";
  const days = positiveInt(url.searchParams.get("days"), 30);
  const limit = positiveInt(url.searchParams.get("limit"), 10);
  const key = `${type}:${days}`;
  const memo = trendingMemos.get(key);
  if (!memo || limit === undefined || limit > MAX_LIMIT)
    return reply({ error: "Ungültige Parameter" }, 400);

  try {
    const items = await memo();
    return Response.json(
      { items: items.slice(0, limit) },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch (error) {
    logRouteError("trending", error);
    return reply({ error: "Die Liste konnte leider nicht jeladen werden." }, 502);
  }
};
