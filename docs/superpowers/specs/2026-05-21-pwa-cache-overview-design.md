# PWA Cache Overview — Design Spec

**Date:** 2026-05-21
**Status:** Approved

## Goal

Add a public-facing `/pwa` page that shows the current Workbox service-worker cache state and lets users manage it. Inspired by the offline cache UI in the TREK travel app.

## Approach

Use the browser **Cache Storage API** directly (`caches.keys()`, `cache.matchAll()`, `caches.delete()`). All logic runs client-side via a Vue composable; no server involvement.

## New Files

| File                                                 | Purpose                                   |
| ---------------------------------------------------- | ----------------------------------------- |
| `src/pages/pwa.astro`                                | Static Astro page at route `/pwa`         |
| `src/components/PwaCacheOverview.vue`                | Vue island (`client:only="vue"`), full UI |
| `src/composables/useCacheStorage.ts`                 | Reactive Cache API logic                  |
| `src/tests/unit/composables/useCacheStorage.test.ts` | Unit tests for composable                 |

No new Nanostores — data is ephemeral/local to the page.

## Data Model

```ts
interface CacheBucket {
  name: string; // Workbox cache name, e.g. "api-search-index"
  entryCount: number;
  totalSizeBytes: number; // sum of Response.clone().blob().size for all entries
  lastModified: Date | null; // from Date response header, null if opaque/unavailable
  urls: string[];
}
```

## Composable: `useCacheStorage`

```ts
// Returns
const {
  buckets, // Ref<CacheBucket[]>
  totalSizeBytes, // ComputedRef<number>
  isLoading, // Ref<boolean>
  onlineStatus, // Ref<'online' | 'offline'>
  loadCaches, // () => Promise<void>
  clearAll, // () => Promise<void>
  clearBucket, // (name: string) => Promise<void>
  reSync, // () => void — postMessage SKIP_WAITING + reload
};
```

**`loadCaches()`** — `caches.keys()` → for each: `cache.matchAll()` → clone each Response, `.blob()` for size, read `Date` header for `lastModified`. Sets `isLoading` during fetch.

**`clearAll()`** — `caches.keys()` → `caches.delete(name)` for each → `loadCaches()`.

**`clearBucket(name)`** — `caches.delete(name)` → `loadCaches()`.

**`reSync()`** — `navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' })` → `location.reload()`. If no SW controller, reload directly.

**`onlineStatus`** — initialized from `navigator.onLine`, updated via `window.addEventListener('online'/'offline')`, cleaned up `onUnmounted`.

## UI Structure (`PwaCacheOverview.vue`)

```
Offline-Cache                     [● Online / ○ Offline]

[4 Caches gecacht]  [12,4 MB gesamt]

[↻ Aktualisieren]  [🗑 Alles leeren]

┌─ api-search-index ─────────── 3,1 MB ──[✕]─┐
│  1 Eintrag · zuletzt: vor 2 Std.             │
├─ api-word-of-the-day ──────── 0,2 MB ──[✕]─┤
│  1 Eintrag · zuletzt: vor 1 Std.             │
├─ workbox-precache-v2-... ──── 8,9 MB ──[✕]─┤
│  47 Einträge · zuletzt: vor 3 Tg.            │
└──────────────────────────────────────────────┘
```

**Bucket name mapping** (display names in German):

| Cache name prefix     | Display name   |
| --------------------- | -------------- |
| `api-search-index`    | Suchindex      |
| `api-search-meta`     | Such-Metadaten |
| `api-word-of-the-day` | Wort des Tages |
| `workbox-precache`    | App-Dateien    |
| (unknown)             | raw cache name |

**Loading state** — skeleton placeholder while `isLoading === true`.

**Empty state** — message "Noch nichts gecacht" when `buckets.length === 0`.

**Confirm dialogs** — single-bucket delete and "clear all" both trigger a confirm modal via the existing `open()` from `@stores/modal.ts` with `defineAsyncComponent`.

**Re-sync flow** — show toast (`createToastNotify`) "Cache wird aktualisiert…" before reload.

**Footer link** — add link to `/pwa` in the site footer alongside Impressum.

## Error Handling

| Scenario                                           | Behavior                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `caches` API unavailable (Private Mode, non-HTTPS) | Render info banner, hide cache list                                |
| Opaque/CORS response — `blob()` fails              | Show `0 B` for that entry, continue                                |
| SW not registered                                  | `reSync()` skips `postMessage`, calls `location.reload()` directly |
| All caches empty                                   | Show empty state UI                                                |

## Tests (`useCacheStorage.test.ts`)

- `loadCaches()` populates `buckets` from mocked `window.caches`
- `clearBucket(name)` calls `caches.delete` with correct name and refreshes
- `clearAll()` deletes all buckets
- `onlineStatus` updates on `online`/`offline` window events
- `formatBytes(bytes)` helper: `1048576 → "1,0 MB"`
- Bucket name mapping function returns correct German labels
