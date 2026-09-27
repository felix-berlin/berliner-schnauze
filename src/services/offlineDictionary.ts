import { requestPersistentStorage } from "@services/storagePersistence";
import { $offlineDictionary, patchOfflineDictionary } from "@stores/pwaSettings.ts";
import { trackEvent } from "@utils/analytics";
import { atom } from "nanostores";

import { version } from "../../package.json";

/** Same cache the NetworkFirst navigation route in astro.config.mjs reads from. */
export const PAGES_CACHE = "pages";
/** Marks a cached page as downloaded by the offline dictionary for a given app version. */
export const VERSION_HEADER = "x-offline-dictionary-version";
export const AVG_PAGE_BYTES = 75_000;
const SEARCH_INDEX_URL = "/api/search/index.json";
const CONCURRENCY = 4;

export type DownloadState = "idle" | "waiting" | "running" | "paused" | "done" | "error";
export type DownloadMode = "background-fetch" | "page";

export interface OfflineDictionaryProgress {
  bytes: number;
  done: number;
  mode: DownloadMode | null;
  state: DownloadState;
  total: number;
}

const IDLE: OfflineDictionaryProgress = { bytes: 0, done: 0, mode: null, state: "idle", total: 0 };

export const $offlineDictionaryProgress = atom<OfflineDictionaryProgress>(IDLE);

const setProgress = (patch: Partial<OfflineDictionaryProgress>): void =>
  $offlineDictionaryProgress.set({ ...$offlineDictionaryProgress.get(), ...patch });

// Network Information API: Chromium only, hence optional everywhere.
type Connection = EventTarget & { saveData?: boolean; type?: string };
const getConnection = (): Connection | undefined =>
  (navigator as Navigator & { connection?: Connection }).connection;

let controller: AbortController | null = null;
/** Set by pause/cancel so runDownload doesn't overwrite the state they chose. */
let stopRequested = false;
let running: Promise<void> | null = null;
let pausedByUser = false;
let listenersAttached = false;

export function canDownloadNow(manual: boolean): boolean {
  const connection = getConnection();
  if (!manual && connection?.saveData) return false;
  if (!$offlineDictionary.get().wifiOnly || connection?.type === undefined) return true;
  return connection.type === "wifi" || connection.type === "ethernet";
}

export async function getWordUrls(): Promise<string[]> {
  const response = await fetch(SEARCH_INDEX_URL);
  if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);
  const entries = (await response.json()) as { slug: string }[];
  return entries.map(({ slug }) => `/wort/${slug}`);
}

export async function getMissingUrls(urls: string[]): Promise<string[]> {
  const cache = await caches.open(PAGES_CACHE);
  const synced = await Promise.all(
    urls.map(async (url) => (await cache.match(url))?.headers.get(VERSION_HEADER) === version),
  );
  return urls.filter((_, i) => !synced[i]);
}

export async function estimateDownloadBytes(): Promise<number> {
  return (await getMissingUrls(await getWordUrls())).length * AVG_PAGE_BYTES;
}

async function downloadInPage(urls: string[]): Promise<void> {
  controller = new AbortController();
  const { signal } = controller;
  const cache = await caches.open(PAGES_CACHE);
  const queue = [...urls];
  setProgress({ mode: "page", state: "running" });

  // Each worker drains the shared queue sequentially; CONCURRENCY workers run in
  // parallel via Promise.all below, which is the point of a bounded worker pool —
  // the sequential awaits per worker are intentional, not an accidental serial loop.
  const worker = async (): Promise<void> => {
    for (let url = queue.shift(); url && !signal.aborted; url = queue.shift()) {
      // oxlint-disable-next-line eslint/no-await-in-loop
      const response = await fetch(url, { signal });
      const progress = $offlineDictionaryProgress.get();
      // A deleted word (404) or a redirect must not fail the whole run; redirected
      // responses can't answer navigations, so they're never cached.
      if (!response.ok || response.redirected) {
        setProgress({ done: progress.done + 1 });
        continue;
      }
      // oxlint-disable-next-line eslint/no-await-in-loop
      const body = await response.blob();
      const headers = new Headers(response.headers);
      headers.set(VERSION_HEADER, version);
      // oxlint-disable-next-line eslint/no-await-in-loop
      await cache.put(
        url,
        new Response(body, { headers, status: response.status, statusText: response.statusText }),
      );
      const latest = $offlineDictionaryProgress.get();
      setProgress({ bytes: latest.bytes + body.size, done: latest.done + 1 });
    }
  };

  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } finally {
    // After the first failure the sibling workers must stop too, or they keep writing
    // while a resumed run starts.
    controller.abort();
  }
}

function markDone(): void {
  controller = null;
  patchOfflineDictionary({ syncedVersion: version });
  setProgress({ done: $offlineDictionaryProgress.get().total, state: "done" });
  trackEvent("App", "Offline dictionary complete", "PWA");
}

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;
  window.addEventListener("online", () => void resumeIfNeeded());
  getConnection()?.addEventListener("change", () => void resumeIfNeeded());
}

async function runDownload(manual: boolean): Promise<void> {
  attachListeners();
  stopRequested = false;
  if (manual) pausedByUser = false;
  if (!canDownloadNow(manual)) {
    setProgress({ state: "waiting" });
    return;
  }
  try {
    const urls = await getWordUrls();
    const missing = await getMissingUrls(urls);
    setProgress({ bytes: 0, done: urls.length - missing.length, total: urls.length });
    if (missing.length > 0) await downloadInPage(missing);
    if (stopRequested) return;
    markDone();
  } catch (err) {
    controller = null;
    // pause/cancel already set the state
    if (stopRequested) return;
    if (!navigator.onLine) {
      setProgress({ state: "paused" });
      return;
    }
    setProgress({ state: "error" });
    console.error("[offlineDictionary] Download failed:", err);
    trackEvent("App", "Offline dictionary error", "PWA");
  }
}

export function startDownload({ manual = false }: { manual?: boolean } = {}): Promise<void> {
  running ??= runDownload(manual).finally(() => {
    running = null;
  });
  return running;
}

export function pauseDownload(): void {
  pausedByUser = true;
  stopRequested = true;
  controller?.abort();
  setProgress({ state: "paused" });
}

export async function cancelDownload(): Promise<void> {
  stopRequested = true;
  controller?.abort();
  controller = null;
  $offlineDictionaryProgress.set(IDLE);
}

export async function enableOfflineDictionary(): Promise<void> {
  patchOfflineDictionary({ enabled: true });
  trackEvent("App", "Offline dictionary enabled", "PWA");
  await requestPersistentStorage();
  await startDownload({ manual: true });
}

export async function disableOfflineDictionary(): Promise<void> {
  await cancelDownload();
  patchOfflineDictionary({ enabled: false, syncedVersion: null });
  const cache = await caches.open(PAGES_CACHE);
  const keys = await cache.keys();
  await Promise.all(
    keys.filter((r) => new URL(r.url).pathname.startsWith("/wort/")).map((r) => cache.delete(r)),
  );
  trackEvent("App", "Offline dictionary disabled", "PWA");
}

/** App start / network or connection change: continue or re-sync if the dictionary needs it. */
export async function resumeIfNeeded(): Promise<void> {
  const { enabled, syncedVersion } = $offlineDictionary.get();
  if (!enabled || pausedByUser || syncedVersion === version) return;
  await startDownload();
}
