// Imported into the Workbox-generated sw.js via `workbox.importScripts` (astro.config.mjs).
// Activating a new SW deletes the outgoing version's hashed /_astro/ files from the precache,
// and the server no longer has them either — but pages cached by that version ("pages":
// visited pages, the offline dictionary) still reference them. On install (the old files
// are still there; Workbox removes them on activate) copy them into an archive that the
// /_astro/ runtime route serves from, so those pages keep working offline.
const ARCHIVE_CACHE = "astro-assets-archive";
// ~3 app versions of JS/CSS/fonts; oldest entries (insertion order) go first.
const MAX_ARCHIVE_ENTRIES = 600;

async function archiveOutgoingAssets() {
  const cacheNames = await caches.keys();
  // An active SW without the archive predates this script: it ran registerType "autoUpdate",
  // whose pages only react to "activated" and never see a waiting SW — they'd never get the
  // update prompt. Take over once, as that SW would have; safe, since the old assets are
  // archived below before Workbox's activate removes them.
  if (self.registration.active && !cacheNames.includes(ARCHIVE_CACHE)) void self.skipWaiting();
  // Always create the archive: its existence marks "this script has run" for the check above.
  const archive = await caches.open(ARCHIVE_CACHE);
  const precacheName = cacheNames.find((name) => name.startsWith("workbox-precache"));
  if (!precacheName) return;
  const precache = await caches.open(precacheName);
  for (const request of await precache.keys()) {
    if (!new URL(request.url).pathname.startsWith("/_astro/")) continue;
    // oxlint-disable-next-line no-await-in-loop -- ~200 small files, sequential keeps memory flat
    const response = await precache.match(request);
    // oxlint-disable-next-line no-await-in-loop -- see above
    if (response) await archive.put(request, response);
  }
  const keys = await archive.keys();
  await Promise.all(
    keys.slice(0, Math.max(0, keys.length - MAX_ARCHIVE_ENTRIES)).map((r) => archive.delete(r)),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(archiveOutgoingAssets().catch((err) => console.error("[sw-asset-archive]", err)));
});
