// Imported into the Workbox-generated sw.js via `workbox.importScripts` (astro.config.mjs).
// Stores the pages of the opt-in offline dictionary downloaded by Background Fetch
// (started in src/services/offlineDictionary.ts) in the same "pages" cache the
// NetworkFirst navigation route reads from.
const PAGES_CACHE = "pages";
const BG_FETCH_PREFIX = "offline-dictionary@";
const VERSION_HEADER = "x-offline-dictionary-version";

const isOurs = (registration) => registration.id.startsWith(BG_FETCH_PREFIX);

async function storeRecords(registration) {
  const version = registration.id.slice(BG_FETCH_PREFIX.length);
  const cache = await caches.open(PAGES_CACHE);
  const records = await registration.matchAll();
  let stored = 0;
  // Sequential on purpose: ~3600 pages in parallel would hold hundreds of MB in memory.
  for (const record of records) {
    // oxlint-disable-next-line no-await-in-loop -- sequential on purpose, see comment above
    const response = await record.responseReady.catch(() => null);
    if (!response?.ok || response.redirected) continue;
    const headers = new Headers(response.headers);
    headers.set(VERSION_HEADER, version);
    try {
      // oxlint-disable-next-line no-await-in-loop -- sequential on purpose, see comment above
      await cache.put(
        record.request,
        // oxlint-disable-next-line no-await-in-loop -- sequential on purpose, see comment above
        new Response(await response.blob(), {
          headers,
          status: response.status,
          statusText: response.statusText,
        }),
      );
      stored++;
    } catch (err) {
      // Realistically QuotaExceededError: further writes would fail the same way, so stop
      // instead of retrying every remaining record.
      console.error("[sw-background-fetch]", err);
      return { failed: true, stored };
    }
  }
  return { failed: false, stored };
}

async function notifyClients(registration, result, stored) {
  const windows = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  for (const client of windows)
    client.postMessage({ id: registration.id, result, stored, type: "offline-dictionary" });
}

async function handleFetchSettled(event, forcedFail) {
  const { failed, stored } = await storeRecords(event.registration);
  const result = forcedFail || failed ? "fail" : "success";
  await event.updateUI({
    title: result === "fail" ? "Offline-Wörterbuch unvollständig" : "Offline-Wörterbuch bereit",
  });
  await notifyClients(event.registration, result, stored);
}

self.addEventListener("backgroundfetchsuccess", (event) => {
  if (!isOurs(event.registration)) return;
  event.waitUntil(handleFetchSettled(event, false));
});

self.addEventListener("backgroundfetchfail", (event) => {
  if (!isOurs(event.registration)) return;
  event.waitUntil(handleFetchSettled(event, true));
});

// Aborts come from "cancel"/"disable" in the app — don't write pages the app is deleting.
self.addEventListener("backgroundfetchabort", (event) => {
  if (!isOurs(event.registration)) return;
  event.waitUntil(notifyClients(event.registration, "abort", 0));
});

self.addEventListener("backgroundfetchclick", (event) => {
  if (!isOurs(event.registration)) return;
  event.waitUntil(self.clients.openWindow("/settings/cache"));
});
