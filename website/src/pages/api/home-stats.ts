import type { APIRoute } from "astro";

import { fetchHomeStats } from "@services/homeStats.ts";
import { reply } from "@utils/apiReply.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";
import { reportError } from "@utils/reportError.ts";

export const GET: APIRoute = async () => {
  try {
    return setPageCache(Response.json(await fetchHomeStats()), { sMaxAge: 3600 });
  } catch (error) {
    reportError(new Error("[home-stats] failed", { cause: error }));
    return reply(
      { error: "Die Zahlen konnten leider nicht jeladen werden. Versuch's später nochmal." },
      502,
    );
  }
};
