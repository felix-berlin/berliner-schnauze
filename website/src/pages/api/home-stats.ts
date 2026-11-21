import type { APIRoute } from "astro";

import { ttl } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";
import { reply } from "@utils/apiReply.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";
import { loadDailyStats, loadHourlyStats } from "payload-app/home-stats-load";

// shortcut: per process; with several web containers use a shared cache.
// Districts and age lists move slowly (a day); popular, rising and the BON numbers ("rounds today") hourly.
const daily = ttl(24 * 3_600_000, async () => loadDailyStats(await getPayloadClient()));
const hourly = ttl(3_600_000, async () => loadHourlyStats(await getPayloadClient()));

export const GET: APIRoute = async () => {
  try {
    const [{ districts, ageLists }, { popular, rising, bon }] = await Promise.all([
      daily(),
      hourly(),
    ]);
    return setPageCache(Response.json({ ageLists, bon, districts, popular, rising }), {
      sMaxAge: 3600,
    });
  } catch (error) {
    console.error("[home-stats] failed:", error);
    return reply({ error: "Die Zahlen konnten leider nicht jeladen werden." }, 502);
  }
};
