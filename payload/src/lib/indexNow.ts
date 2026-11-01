import { siteUrl } from "./routes";

const ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Tells IndexNow engines (Bing, Yandex, Naver, Seznam, Yep) that these site paths changed, appeared or are gone.
 * Fire and forget: a failed ping is only reported to `onError`, never thrown. Does nothing without INDEXNOW_KEY
 * (dev, tests). The site serves the key at /indexnow.txt as proof of ownership.
 */
export const pingIndexNow = (paths: string[], onError: (message: string) => void = console.error): void => {
  const key = process.env.INDEXNOW_KEY;
  const urls = [...new Set(paths)].map((path) => `${siteUrl()}${path}`);
  if (!key || urls.length === 0) return;
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(siteUrl()).host, key, keyLocation: `${siteUrl()}/indexnow.txt`, urlList: urls }),
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => {
      if (!res.ok) onError(`[indexnow] ${res.status} for ${urls.length} URL(s)`);
    })
    .catch((error: unknown) => onError(`[indexnow] ${error instanceof Error ? error.message : String(error)}`));
};
