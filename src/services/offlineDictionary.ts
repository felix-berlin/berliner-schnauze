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
const BG_FETCH_PREFIX = "offline-dictionary@";
/** Carries the app version so public/sw-background-fetch.js can stamp VERSION_HEADER. */
export const BG_FETCH_ID = `${BG_FETCH_PREFIX}${version}`;

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

// Background Fetch API: Chromium only, not in lib.dom — typed locally.
type BackgroundFetchRegistrationLike = EventTarget & {
  abort(): Promise<boolean>;
  downloaded: number;
  id: string;
};
type BackgroundFetchManagerLike = {
  fetch(
    id: string,
    requests: string[],
    options: { icons: { sizes: string; src: string; type: string }[]; title: string },
  ): Promise<BackgroundFetchRegistrationLike>;
  get(id: string): Promise<BackgroundFetchRegistrationLike | undefined>;
  getIds(): Promise<string[]>;
};

async function getBackgroundFetchManager(): Promise<BackgroundFetchManagerLike | undefined> {
  const registration = await navigator.serviceWorker?.getRegistration();
  return (registration as { backgroundFetch?: BackgroundFetchManagerLike } | undefined)
    ?.backgroundFetch;
}

/** Aborts our fetches the page may not track (older app version, or not re-attached after a reload). */
async function abortBackgroundFetches(
  manager: BackgroundFetchManagerLike,
  exceptId?: string,
): Promise<void> {
  for (const id of await manager.getIds()) {
    if (id.startsWith(BG_FETCH_PREFIX) && id !== exceptId) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- one or two ids in practice
      await (await manager.get(id))?.abort();
    }
  }
}

/** The Background Fetch that currently owns the download; its completion arrives via SW message. */
let activeBgFetch: BackgroundFetchRegistrationLike | null = null;

/** The current run's AbortController, created fresh by runDownload for every run. */
let controller: AbortController | null = null;
let running: Promise<void> | null = null;
/**
 * Every run's promise, from the moment startDownload creates it until it settles —
 * independent of `running`, which pause() clears early so a manual start right after
 * pause can begin immediately. cancelDownload awaits this set so it never returns (and
 * lets a caller like disableOfflineDictionary touch the cache) while a paused-but-not-
 * yet-settled run could still land an in-flight cache.put.
 */
const unsettledRuns = new Set<Promise<void>>();
let pausedByUser = false;
let listenersAttached = false;

export function canDownloadNow(manual: boolean): boolean {
  const connection = getConnection();
  if (!manual && connection?.saveData) return false;
  if (!$offlineDictionary.get().wifiOnly || connection?.type === undefined) return true;
  return connection.type === "wifi" || connection.type === "ethernet";
}

export async function getWordUrls(signal?: AbortSignal): Promise<string[]> {
  const response = await fetch(SEARCH_INDEX_URL, { signal });
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

/**
 * Downloads `urls` into the pages cache using a bounded worker pool (CONCURRENCY
 * workers pulling from one shared queue — the sequential awaits per worker are
 * intentional, not an accidental serial loop; parallelism comes from running
 * several workers at once via Promise.all).
 *
 * The run's own AbortSignal is checked before every state-mutating step (deciding
 * to skip/cache a page, bumping progress) so that once a run is paused/cancelled,
 * a worker that was already mid-flight can never write stale data into the cache
 * or the shared progress store.
 */
async function downloadInPage(urls: string[], signal: AbortSignal): Promise<void> {
  const cache = await caches.open(PAGES_CACHE);
  // caches.open is async — if pause/cancel aborted while it was in flight, don't
  // touch anything: no queue, no progress, no fetches.
  if (signal.aborted) return;
  const queue = [...urls];
  let failure: { error: unknown } | null = null;

  const worker = async (): Promise<void> => {
    for (let url = queue.shift(); url && !signal.aborted && !failure; url = queue.shift()) {
      let response: Response;
      try {
        // oxlint-disable-next-line eslint/no-await-in-loop
        response = await fetch(url, { signal });
      } catch (err) {
        if (signal.aborted) return; // paused/cancelled while this fetch was in flight
        failure = { error: err };
        return;
      }
      if (signal.aborted) return;
      // A deleted word (404/410) must not fail the whole run. A redirect can't
      // answer a navigation, so it's skipped too — but any other non-ok status
      // (e.g. a transient 5xx) must not be silently marked as synced.
      if (response.status === 404 || response.status === 410 || response.redirected) {
        setProgress({ done: $offlineDictionaryProgress.get().done + 1 });
        continue;
      }
      if (!response.ok) {
        failure = { error: new Error(`Page request failed: ${response.status}`) };
        return;
      }
      // oxlint-disable-next-line eslint/no-await-in-loop
      const body = await response.blob();
      if (signal.aborted) return;
      const headers = new Headers(response.headers);
      headers.set(VERSION_HEADER, version);
      try {
        // oxlint-disable-next-line eslint/no-await-in-loop
        await cache.put(
          url,
          new Response(body, { headers, status: response.status, statusText: response.statusText }),
        );
      } catch (err) {
        if (signal.aborted) return;
        failure = { error: err };
        return;
      }
      if (signal.aborted) return; // don't count a write that raced a pause/cancel
      const latest = $offlineDictionaryProgress.get();
      setProgress({ bytes: latest.bytes + body.size, done: latest.done + 1 });
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (failure && !signal.aborted) throw failure.error;
}

function markDone(): void {
  activeBgFetch = null;
  patchOfflineDictionary({ syncedVersion: version });
  setProgress({ done: $offlineDictionaryProgress.get().total, state: "done" });
  trackEvent("App", "Offline dictionary complete", "PWA");
}

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;
  window.addEventListener("online", () => void resumeIfNeeded());
  getConnection()?.addEventListener("change", () => void resumeIfNeeded());
  navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
}

function followBackgroundFetch(bgFetch: BackgroundFetchRegistrationLike, missing: number): void {
  activeBgFetch = bgFetch;
  const alreadyDone = $offlineDictionaryProgress.get().done;
  setProgress({ mode: "background-fetch", state: "running" });
  // No per-request progress in the API — estimate done from bytes.
  bgFetch.addEventListener("progress", () => {
    if (activeBgFetch !== bgFetch) return; // cancelled/finished: don't touch the reset state
    setProgress({
      bytes: bgFetch.downloaded,
      done: alreadyDone + Math.min(missing, Math.floor(bgFetch.downloaded / AVG_PAGE_BYTES)),
    });
  });
}

/**
 * Returns true when the run is over for the page: a Background Fetch now owns the
 * download, or the run was paused/cancelled meanwhile (any fetch it acquired is aborted).
 * Returns false when the in-page download has to do the work.
 */
async function tryBackgroundFetch(missing: string[], signal: AbortSignal): Promise<boolean> {
  let bgFetch: BackgroundFetchRegistrationLike | undefined;
  try {
    const manager = await getBackgroundFetchManager();
    if (!manager) return false;

    await abortBackgroundFetches(manager, BG_FETCH_ID);

    // Re-attach (e.g. after a reload) instead of starting a second fetch with the same id.
    bgFetch =
      (await manager.get(BG_FETCH_ID)) ??
      (signal.aborted
        ? undefined
        : await manager.fetch(BG_FETCH_ID, missing, {
            icons: [
              { sizes: "192x192", src: "/favicons/android-chrome-192x192.png", type: "image/png" },
            ],
            title: "Berliner Schnauze – Offline-Wörterbuch",
          }));
  } catch (err) {
    if (signal.aborted) return true;
    console.warn("[offlineDictionary] Background Fetch unavailable, downloading in page:", err);
    return false;
  }
  if (signal.aborted) {
    // Paused/cancelled while setting up: cancelDownload awaits this run, so aborting
    // here lands before disableOfflineDictionary wipes the cache.
    await bgFetch?.abort().catch(() => false);
    return true;
  }
  if (!bgFetch) return false;
  followBackgroundFetch(bgFetch, missing.length);
  return true;
}

/**
 * A "success" with no tracked fetch (e.g. the page was reloaded and the run is parked in
 * "waiting") isn't trusted blindly: the dictionary is marked done only once the cache
 * holds every page for this version.
 */
async function verifySynced(): Promise<void> {
  const isCandidate = () => {
    const { enabled, syncedVersion } = $offlineDictionary.get();
    return enabled && syncedVersion !== version && !running && !activeBgFetch;
  };
  if (!isCandidate()) return;
  try {
    const urls = await getWordUrls();
    const missing = await getMissingUrls(urls);
    if (missing.length > 0 || !isCandidate()) return;
    setProgress({ total: urls.length });
    markDone();
  } catch {
    // Best effort — the next run re-checks the cache anyway.
  }
}

function onServiceWorkerMessage(event: MessageEvent<{ result?: string; type?: string }>): void {
  if (event.data?.type !== "offline-dictionary") return;
  if (!activeBgFetch) {
    if (event.data.result === "success") void verifySynced();
    // "fail"/"abort" untracked: cancelDownload already reset the state (its own abort),
    // or the next run retries whatever is still missing.
    return;
  }
  activeBgFetch = null;
  if (event.data.result === "success") markDone();
  else if (event.data.result === "fail") {
    setProgress({ state: "error" });
    trackEvent("App", "Offline dictionary error", "PWA");
  } else if (event.data.result === "abort") {
    // Tracked fetch aborted from outside the app (the browser's download UI): treat it
    // like a pause so online/connection changes don't restart it; "resume" starts anew.
    pausedByUser = true;
    setProgress({ state: "paused" });
  }
}

async function runDownload(manual: boolean): Promise<void> {
  attachListeners();
  if (manual) pausedByUser = false;
  // Every run gets its own controller so a stale (paused/cancelled) run's tail
  // can never affect a subsequent run through a shared abort flag.
  const runController = new AbortController();
  controller = runController;
  const { signal } = runController;
  if (!canDownloadNow(manual)) {
    setProgress({ state: "waiting" });
    return;
  }
  try {
    const urls = await getWordUrls(signal);
    if (signal.aborted) return;
    const missing = await getMissingUrls(urls);
    if (signal.aborted) return;
    setProgress({ bytes: 0, done: urls.length - missing.length, total: urls.length });
    if (missing.length > 0) {
      // Completion of a Background Fetch arrives via onServiceWorkerMessage.
      if (await tryBackgroundFetch(missing, signal)) return;
      if (signal.aborted) return;
      setProgress({ mode: "page", state: "running" });
      await downloadInPage(missing, signal);
    }
    if (signal.aborted) return;
    markDone();
  } catch (err) {
    // A stale (paused/cancelled) run must never touch shared state once its own
    // signal is aborted — pause/cancel already set the state they wanted.
    if (signal.aborted) return;
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
  if (activeBgFetch) return Promise.resolve();
  if (!running) {
    const runPromise: Promise<void> = runDownload(manual).finally(() => {
      unsettledRuns.delete(runPromise);
      // Only clear `running` if it still points at this exact run — pause/cancel
      // may already have cleared it (and a newer run may already be in flight).
      if (running === runPromise) running = null;
    });
    running = runPromise;
    unsettledRuns.add(runPromise);
  }
  return running;
}

export function pauseDownload(): void {
  pausedByUser = true;
  controller?.abort();
  // Clear immediately (not via the run's `finally`) so a manual start right after
  // pause begins a new run instead of returning the still-settling old one. The run
  // stays in `unsettledRuns` until it actually finishes, so cancelDownload can still
  // find and await it later.
  running = null;
  setProgress({ state: "paused" });
}

export async function cancelDownload(): Promise<void> {
  controller?.abort();
  running = null;
  controller = null;
  const bgFetch = activeBgFetch;
  activeBgFetch = null;
  // Reset before awaiting the old run(s) below — a run started while this await is
  // still pending must own the final state, not have it wiped back to idle once the
  // (already-aborted) old run(s) finally settle.
  $offlineDictionaryProgress.set(IDLE);
  // Await every still-unsettled run (not just the last one `running` pointed at — a
  // paused run is no longer `running` but may still have in-flight cache.put calls),
  // so a caller like disableOfflineDictionary never wipes the cache while one of
  // them could still land a write.
  // Also abort fetches nothing tracks (e.g. after a reload with the run parked in
  // "waiting") — the SW would otherwise write pages after disable wiped them.
  await Promise.allSettled([
    ...unsettledRuns,
    bgFetch?.abort(),
    getBackgroundFetchManager().then((manager) => manager && abortBackgroundFetches(manager)),
  ]);
}

export async function enableOfflineDictionary(): Promise<void> {
  patchOfflineDictionary({ enabled: true });
  trackEvent("App", "Offline dictionary enabled", "PWA");
  await requestPersistentStorage();
  await startDownload({ manual: true });
}

export async function disableOfflineDictionary(): Promise<void> {
  // Disable first: an online/connection change during the cancel below must not let
  // resumeIfNeeded start a new run that refills /wort/* during or after the wipe.
  patchOfflineDictionary({ enabled: false, syncedVersion: null });
  await cancelDownload();
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
  // An error (e.g. quota exceeded) must not be retried by every online/connection
  // change — that's frequent on mobile and would violate "no endless retry". Only
  // a manual startDownload() (the user hitting "retry") should get past this.
  if ($offlineDictionaryProgress.get().state === "error") return;
  await startDownload();
}
