import type { HomeStats } from "payload-app/home-stats-load";

import { ttl } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";
import { reportError } from "@utils/reportError.ts";
import { loadDailyStats, loadHourlyStats } from "payload-app/home-stats-load";

// shortcut: per process; with several web containers use a shared cache.
// Districts and age lists move slowly (a day); popular, rising and the BON numbers ("rounds today") hourly.
const daily = ttl(24 * 3_600_000, async () => loadDailyStats(await getPayloadClient()));
const hourly = ttl(3_600_000, async () => loadHourlyStats(await getPayloadClient()));

const fetchHomeStats = async (): Promise<HomeStats> => {
  const [{ districts, ageLists }, { popular, rising, bon }] = await Promise.all([
    daily(),
    hourly(),
  ]);
  return { ageLists, bon, districts, popular, rising };
};

const FAILURE_PAUSE_MS = 60_000;
let failedAt = 0;

/**
 * The start page aggregates, shared by the page and GET /api/home-stats; null when they fail (docs/design/startseite-v20/SPEC.md §13:
 * the sections drop). A failed first load is not cached by `ttl`, so a short pause here keeps every caller from re-running the failing queries.
 */
export const fetchHomeStatsOrNull = async (): Promise<HomeStats | null> => {
  if (Date.now() - failedAt < FAILURE_PAUSE_MS) return null;
  try {
    return await fetchHomeStats();
  } catch (error) {
    failedAt = Date.now();
    reportError(error, "[home] stats unavailable");
    return null;
  }
};
