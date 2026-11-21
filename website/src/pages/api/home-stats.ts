import type { APIRoute } from "astro";

import { fetchHomeStatsOrNull } from "@services/homeStats.ts";
import { reply } from "@utils/apiReply.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";

export const GET: APIRoute = async () => {
  const stats = await fetchHomeStatsOrNull();
  return stats
    ? setPageCache(Response.json(stats), { sMaxAge: 3600 })
    : reply(
        { error: "Die Zahlen konnten leider nicht jeladen werden. Versuch's später nochmal." },
        502,
      );
};
