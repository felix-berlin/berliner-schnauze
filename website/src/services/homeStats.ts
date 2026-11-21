import type { HomeStats } from "payload-app/home-stats-load";

import { ttl } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";
import { loadDailyStats, loadHourlyStats } from "payload-app/home-stats-load";

// shortcut: per process; with several web containers use a shared cache.
// Districts and age lists move slowly (a day); popular, rising and the BON numbers ("rounds today") hourly.
const daily = ttl(24 * 3_600_000, async () => loadDailyStats(await getPayloadClient()));
const hourly = ttl(3_600_000, async () => loadHourlyStats(await getPayloadClient()));

/** The start page aggregates; one cache for the page and GET /api/home-stats. */
export const fetchHomeStats = async (): Promise<HomeStats> => {
  const [{ districts, ageLists }, { popular, rising, bon }] = await Promise.all([daily(), hourly()]);
  return { ageLists, bon, districts, popular, rising };
};
