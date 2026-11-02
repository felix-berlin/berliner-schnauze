import { siteUrl } from "./routes";

const ENDPOINT = "https://api.indexnow.org/indexnow";

const DEBOUNCE_MS = 2000;
// IndexNow takes up to 10,000 URLs per request.
const MAX_URLS = 10_000;

let pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;
let onErrors: ((message: string) => void)[] = [];

const send = async (): Promise<void> => {
  clearTimeout(timer);
  timer = undefined;
  const key = process.env.INDEXNOW_KEY;
  const urls = [...pending];
  const reporters = onErrors;
  pending = new Set();
  onErrors = [];
  if (!key || urls.length === 0) return;
  const report = (message: string) => reporters.forEach((fn) => fn(message));
  for (let i = 0; i < urls.length; i += MAX_URLS) {
    const urlList = urls.slice(i, i + MAX_URLS);
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(siteUrl()).host, key, keyLocation: `${siteUrl()}/indexnow.txt`, urlList }),
      signal: AbortSignal.timeout(5000),
    })
      .then((res) => {
        if (!res.ok) report(`[indexnow] ${res.status} for ${urlList.length} URL(s)`);
      })
      .catch((error: unknown) => report(`[indexnow] ${error instanceof Error ? error.message : String(error)}`));
  }
};

/** Sends what is queued right away (tests, shutdown). */
export const flushIndexNow = send;

/**
 * Tells IndexNow engines (Bing, Yandex, Naver, Seznam, Yep) that these site paths changed, appeared or are gone.
 * Pings are collected for a moment and sent as one request, so a bulk publish does not fire one request per word.
 * Fire and forget: a failed ping is only reported to `onError`, never thrown. Does nothing without INDEXNOW_KEY
 * (dev, tests). The site serves the key at /indexnow.txt as proof of ownership.
 */
export const pingIndexNow = (paths: string[], onError: (message: string) => void = console.error): void => {
  if (!process.env.INDEXNOW_KEY || paths.length === 0) return;
  for (const path of paths) pending.add(`${siteUrl()}${path}`);
  onErrors.push(onError);
  timer ??= setTimeout(() => void send(), DEBOUNCE_MS);
  timer.unref?.();
};
