import type { APIRoute } from "astro";

import { ttl } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";
import { reply } from "@utils/apiReply.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";
import { loadDailyStats, loadHourlyStats } from "payload-app/home-stats-load";

// shortcut: per process; with several web containers use a shared cache.
// TODO(startseite): bon.roundsToday rides on the daily memo, so it lags by up to a day; confirm or move it to hourly.
const daily = ttl(24 * 3_600_000, async () => loadDailyStats(await getPayloadClient()));
const hourly = ttl(3_600_000, async () => loadHourlyStats(await getPayloadClient()));

export const GET: APIRoute = async () => {
  try {
    const [{ districts, ageLists, bon }, { popular, rising }] = await Promise.all([
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
