import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { WAKAPI_HOST } from "astro:env/client";
import { WAKAPI_API_KEY } from "astro:env/server";

export interface WakapiStats {
  hours: number;
  minutes: number;
}

interface CachedStats extends WakapiStats {
  failed?: boolean;
  fetchedAt: number;
}

const CACHE_FILE = join(process.cwd(), ".astro/wakapi-stats.json");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — stats don't need to be real-time
// Failures are cached too: without this, every prerendered page that reads these
// stats retries the fetch and stalls the whole build when Wakapi is down.
const FAILURE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

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

export async function getWakapiStats(): Promise<WakapiStats> {
  if (!WAKAPI_API_KEY) return { hours: 0, minutes: 0 };

  const cached = readCache();
  if (cached) return { hours: cached.hours, minutes: cached.minutes };

  try {
    // Use the cached WakaTime-compat all-time endpoint. /api/summary?interval=any
    // is not a valid interval and triggers an unbounded aggregation that never
    // completes within FETCH_TIMEOUT_MS; this endpoint is precomputed (~500ms).
    const res = await fetch(
      `${WAKAPI_HOST}/api/compat/wakatime/v1/users/current/all_time_since_today?project=berliner-schnauze`,
      {
        headers: {
          Authorization: `Bearer ${Buffer.from(WAKAPI_API_KEY).toString("base64")}`,
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );

    if (res.ok) {
      const json = await res.json();
      const totalSeconds: number = json.data?.total_seconds ?? 0;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      writeCache({ fetchedAt: Date.now(), hours, minutes });
      return { hours, minutes };
    }
    writeCache({ failed: true, fetchedAt: Date.now(), hours: 0, minutes: 0 });
    console.log(`Wakapi stats request failed with status ${res.status}.`);
  } catch {
    writeCache({ failed: true, fetchedAt: Date.now(), hours: 0, minutes: 0 });
    console.log("Wakapi stats could not be fetched.");
  }
  return { hours: 0, minutes: 0 };
}
