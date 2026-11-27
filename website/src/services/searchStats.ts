import type { SearchStat } from "payload-app/search-stats-load";

import { ttl } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";
import { reportError } from "@utils/reportError.ts";
import { loadSearchStats } from "payload-app/search-stats-load";

import type { Usage } from "@/lib/search/types";

// The payload package cannot import website types: this fails to compile if the two Usage shapes drift apart.
type _Compatible = NonNullable<SearchStat["usage"]> extends Usage ? true : never;
export const usageTypesMatch: _Compatible = true;

// Throws on failure so `ttl` retries a failed first load and keeps stale data on a failed refresh.
export const getSearchStats = ttl(24 * 3600_000, async () =>
  loadSearchStats(await getPayloadClient()),
);

/** Survey shares and story counts per word id; an empty map (not cached) when the load fails, so the index still builds. */
export const searchStatsOrEmpty = async (): Promise<Map<number, SearchStat>> => {
  try {
    return await getSearchStats();
  } catch (error) {
    reportError(error, "searchStats");
    return new Map();
  }
};
