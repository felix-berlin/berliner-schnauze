import type { APIRoute } from "astro";

import { fetchHomeStats } from "@services/homeStats.ts";
import { reply } from "@utils/apiReply.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";

export const GET: APIRoute = async () => {
  try {
    return setPageCache(Response.json(await fetchHomeStats()), { sMaxAge: 3600 });
  } catch (error) {
    console.error("[home-stats] failed:", error);
    return reply({ error: "Die Zahlen konnten leider nicht jeladen werden." }, 502);
  }
};
