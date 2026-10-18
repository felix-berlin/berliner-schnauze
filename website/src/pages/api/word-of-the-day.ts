import type { APIRoute } from "astro";

import { fetchAllWords } from "@services/payload/words.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";
import { pickWordOfTheDay, toWordOfTheDayResponse } from "@utils/wordOfTheDay.ts";

export const GET: APIRoute = async () => {
  const now = new Date();
  const word = pickWordOfTheDay(await fetchAllWords(), now);
  if (!word) return Response.json({ error: "no words" }, { status: 404 });

  const body = toWordOfTheDayResponse(word, now);
  return setPageCache(Response.json(body), { sMaxAge: Math.min(3600, body.expires) });
};
