import type { APIRoute } from "astro";

import { fetchAllWords } from "@services/api.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";
import { pickWordOfTheDay, toWordOfTheDayResponse } from "@utils/wordOfTheDay.ts";

export const GET: APIRoute = async () => {
  const now = new Date();
  const word = pickWordOfTheDay(await fetchAllWords(), now);
  if (!word)
    return Response.json(
      { error: "no words" },
      { headers: { "Cache-Control": "no-store" }, status: 404 },
    );

  const body = toWordOfTheDayResponse(word, now);
  const res = Response.json(body);
  setPageCache(res, { sMaxAge: Math.min(3600, body.expires) });
  return res;
};
