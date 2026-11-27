import type { SearchStat } from "payload-app/search-stats-load";

import { ttl } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";
import { reportError } from "@utils/reportError.ts";
import { loadSearchStats } from "payload-app/search-stats-load";

import type { Usage } from "@/lib/search/types";

// The payload package cannot import website types: this fails to compile if the two Usage shapes drift apart.
type _Compatible = NonNullable<SearchStat["usage"]> extends Usage ? true : never;
export const usageTypesMatch: _Compatible = true;

/** Survey shares and story counts per word id; an empty map when the load fails (the index still builds). */
export const getSearchStats = ttl(24 * 3600_000, async (): Promise<Map<number, SearchStat>> => {
  try {
    return await loadSearchStats(await getPayloadClient());
  } catch (error) {
    reportError(error);
    return new Map();
  }
});
