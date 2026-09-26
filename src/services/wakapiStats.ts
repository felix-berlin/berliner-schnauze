import { fetchJson } from "@services/fetchJson.ts";
import { WAKAPI_HOST } from "astro:env/client";
import { WAKAPI_API_KEY } from "astro:env/server";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface CachedStats {
  failed?: boolean;
  fetchedAt: number;
  hours: number;
  minutes: number;
}

export interface WakapiStats {
  hours: number;
  minutes: number;
}

const CACHE_FILE = join(process.cwd(), ".astro/wakapi-stats.json");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — stats don't need to be real-time
// Failures are cached too: without this, every prerendered page (the footer is
// on all of them) retries the fetch and stalls the whole build when Wakapi is down.
const FAILURE_TTL_MS = 5 * 60 * 1000;

function readCache(): CachedStats | null {
  try {
    const data = JSON.parse(readFileSync(CACHE_FILE, "utf-8")) as CachedStats;
    const ttl = data.failed ? FAILURE_TTL_MS : CACHE_TTL_MS;
    if (Date.now() - data.fetchedAt < ttl) return data;
  } catch {
    /* file missing or malformed — treat as cache miss */
  }
  return null;
}

function writeCache(stats: CachedStats) {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(stats));
  } catch {
    /* non-critical — next request will just fetch again */
  }
}

async function loadStats(): Promise<WakapiStats> {
  if (!WAKAPI_API_KEY) return { hours: 0, minutes: 0 };

  const cached = readCache();
  if (cached) return { hours: cached.hours, minutes: cached.minutes };

  // Use the cached WakaTime-compat all-time endpoint. /api/summary?interval=any
  // is not a valid interval and triggers an unbounded aggregation that never
  // completes within the fetch timeout; this endpoint is precomputed (~500ms).
  const json = await fetchJson<{ data?: { total_seconds?: number } }>(
    `${WAKAPI_HOST}/api/compat/wakatime/v1/users/current/all_time_since_today?project=berliner-schnauze`,
    { Authorization: `Bearer ${Buffer.from(WAKAPI_API_KEY).toString("base64")}` },
    "Wakapi stats",
  );
  if (!json) {
    writeCache({ failed: true, fetchedAt: Date.now(), hours: 0, minutes: 0 });
    return { hours: 0, minutes: 0 };
  }

  const totalSeconds = json.data?.total_seconds ?? 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  writeCache({ fetchedAt: Date.now(), hours, minutes });
  return { hours, minutes };
}

// The footer renders on every page: resolve once per process instead of re-reading
// and re-parsing the cache file per page. The file cache still spans builds.
let statsPromise: Promise<WakapiStats> | undefined;
export const getWakapiStats = (): Promise<WakapiStats> => (statsPromise ??= loadStats());
