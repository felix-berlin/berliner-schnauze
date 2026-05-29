# PWA Cache Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/pwa` page that displays Workbox service-worker cache state (buckets, sizes, timestamps) and lets users clear individual caches, clear all, or force a re-sync.

**Architecture:** A Vue composable (`useCacheStorage`) wraps the browser Cache Storage API reactively. A Vue island (`PwaCacheOverview.vue`) consumes it client-only. An Astro page (`pwa.astro`) hosts the island. No server involvement; all data is ephemeral/local.

**Tech Stack:** Vue 3 Composition API, TypeScript, Workbox (already configured via `@vite-pwa/astro`), Vitest + jsdom for tests, existing modal (`open()` from `@stores/modal.ts`) and toast (`createToastNotify` from `@stores/toastNotify.ts`) systems.

---

## File Map

| Action | Path                                                | Responsibility                               |
| ------ | --------------------------------------------------- | -------------------------------------------- |
| Create | `src/composable/useCacheStorage.ts`                 | Cache API logic, reactive state, all actions |
| Create | `src/components/PwaCacheOverview.vue`               | Full cache overview UI, `client:only="vue"`  |
| Create | `src/pages/pwa.astro`                               | Static Astro page at `/pwa`                  |
| Create | `src/tests/unit/composable/useCacheStorage.test.ts` | Unit tests for composable                    |
| Modify | `src/components/Footer.astro`                       | Add `/pwa` link to `navMenu1`                |

---

### Task 1: Types and helper functions

**Files:**

- Create: `src/composable/useCacheStorage.ts`
- Create: `src/tests/unit/composable/useCacheStorage.test.ts`

- [ ] **Step 1: Write the failing tests for helpers**

Create `src/tests/unit/composable/useCacheStorage.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatBytes, getBucketDisplayName } from "@composables/useCacheStorage";

describe("formatBytes", () => {
  it('returns "0 B" for 0', () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("returns bytes for values under 1 KB", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats KB range", () => {
    expect(formatBytes(2048)).toBe("2,0 KB");
  });

  it("formats MB range", () => {
    expect(formatBytes(1_048_576)).toBe("1,0 MB");
  });

  it("formats fractional MB", () => {
    expect(formatBytes(3_250_000)).toBe("3,1 MB");
  });
});

describe("getBucketDisplayName", () => {
  it("maps api-search-index", () => {
    expect(getBucketDisplayName("api-search-index")).toBe("Suchindex");
  });

  it("maps api-search-meta", () => {
    expect(getBucketDisplayName("api-search-meta")).toBe("Such-Metadaten");
  });

  it("maps api-word-of-the-day", () => {
    expect(getBucketDisplayName("api-word-of-the-day")).toBe("Wort des Tages");
  });

  it("maps workbox-precache with versioned suffix", () => {
    expect(getBucketDisplayName("workbox-precache-v2-https://example.com/")).toBe("App-Dateien");
  });

  it("returns raw name for unknown cache", () => {
    expect(getBucketDisplayName("my-custom-cache")).toBe("my-custom-cache");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/tests/unit/composable/useCacheStorage.test.ts
```

Expected: FAIL — `Cannot find module '@composables/useCacheStorage'`

- [ ] **Step 3: Create the composable with types and helpers**

Create `src/composable/useCacheStorage.ts`:

```ts
export interface CacheBucket {
  name: string;
  entryCount: number;
  totalSizeBytes: number;
  lastModified: Date | null;
  urls: string[];
}

const BUCKET_NAME_MAP: Record<string, string> = {
  "api-search-index": "Suchindex",
  "api-search-meta": "Such-Metadaten",
  "api-word-of-the-day": "Wort des Tages",
  "workbox-precache": "App-Dateien",
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function getBucketDisplayName(name: string): string {
  for (const [prefix, displayName] of Object.entries(BUCKET_NAME_MAP)) {
    if (name.startsWith(prefix)) return displayName;
  }
  return name;
}
```

> Note: `@composables/*` alias maps to `src/composable/` (singular) per `tsconfig.json` — the directory name is `composable`, not `composables`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/tests/unit/composable/useCacheStorage.test.ts
```

Expected: PASS (10 tests)

- [ ] **Step 5: Check alias is wired up**

```bash
grep -r "composables" tsconfig.json
```

If alias is `@composables/*` → `src/composable/*`, you're fine. If it's different, adjust the import in the test file to match the actual alias (see `tsconfig.json` `paths`).

- [ ] **Step 6: Commit**

```bash
git add src/composable/useCacheStorage.ts src/tests/unit/composable/useCacheStorage.test.ts
git commit -m "feat: add CacheBucket type and cache helper functions"
```

---

### Task 2: `useCacheStorage` — `loadCaches` + reactive state

**Files:**

- Modify: `src/composable/useCacheStorage.ts`
- Modify: `src/tests/unit/composable/useCacheStorage.test.ts`

- [ ] **Step 1: Add test helpers and `loadCaches` tests**

Append to `src/tests/unit/composable/useCacheStorage.test.ts`:

```ts
import { vi, beforeEach, afterEach } from "vitest";
import { createApp } from "vue";
import { useCacheStorage } from "@composables/useCacheStorage";

// Helper: mounts a composable inside a Vue app (needed for onMounted/onUnmounted)
function withSetup<T>(composable: () => T): { result: T; unmount: () => void } {
  let result!: T;
  const app = createApp({
    setup() {
      result = composable();
      return () => null;
    },
  });
  const el = document.createElement("div");
  app.mount(el);
  return { result, unmount: () => app.unmount() };
}

// Helper: builds a mock CacheStorage
function makeMockCacheStorage(
  data: Record<string, Array<{ url: string; dateStr?: string; size?: number }>>,
) {
  const cacheInstances = Object.fromEntries(
    Object.entries(data).map(([name, entries]) => {
      const requests = entries.map((e) => new Request(e.url));
      const responseMap = new Map(
        entries.map((e) => [
          e.url,
          new Response(new Uint8Array(e.size ?? 100), {
            headers: e.dateStr ? { Date: e.dateStr } : {},
          }),
        ]),
      );
      return [
        name,
        {
          keys: vi.fn().mockResolvedValue(requests),
          match: vi
            .fn()
            .mockImplementation((req: Request) =>
              Promise.resolve(responseMap.get(req.url) ?? null),
            ),
          delete: vi.fn().mockResolvedValue(true),
        },
      ];
    }),
  );

  return {
    keys: vi.fn().mockResolvedValue(Object.keys(data)),
    open: vi.fn().mockImplementation((name: string) => Promise.resolve(cacheInstances[name])),
    delete: vi.fn().mockImplementation((name: string) => {
      delete cacheInstances[name];
      return Promise.resolve(true);
    }),
    has: vi.fn(),
    match: vi.fn(),
  };
}

describe("useCacheStorage — loadCaches", () => {
  let mockCacheStorage: ReturnType<typeof makeMockCacheStorage>;

  beforeEach(() => {
    mockCacheStorage = makeMockCacheStorage({
      "api-search-index": [
        {
          url: "https://example.com/api/search/index.json",
          size: 1024,
          dateStr: "Thu, 01 Jan 2026 10:00:00 GMT",
        },
      ],
      "api-word-of-the-day": [{ url: "https://example.com/api/word-of-the-day", size: 512 }],
    });
    vi.stubGlobal("caches", mockCacheStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("populates buckets with correct names", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.buckets.value.map((b) => b.name)).toEqual([
      "api-search-index",
      "api-word-of-the-day",
    ]);
    unmount();
  });

  it("counts entries per bucket", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    const idx = result.buckets.value.find((b) => b.name === "api-search-index")!;
    expect(idx.entryCount).toBe(1);
    unmount();
  });

  it("sums total size in bytes", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    const idx = result.buckets.value.find((b) => b.name === "api-search-index")!;
    expect(idx.totalSizeBytes).toBe(1024);
    unmount();
  });

  it("reads lastModified from Date header", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    const idx = result.buckets.value.find((b) => b.name === "api-search-index")!;
    expect(idx.lastModified).toBeInstanceOf(Date);
    expect(idx.lastModified?.toISOString()).toBe("2026-01-01T10:00:00.000Z");
    unmount();
  });

  it("sets lastModified to null when no Date header", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    const wotd = result.buckets.value.find((b) => b.name === "api-word-of-the-day")!;
    expect(wotd.lastModified).toBeNull();
    unmount();
  });

  it("computes correct totalSizeBytes across all buckets", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.totalSizeBytes.value).toBe(1024 + 512);
    unmount();
  });

  it("sets isLoading false after completion", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    const promise = result.loadCaches();
    expect(result.isLoading.value).toBe(true);
    await promise;
    expect(result.isLoading.value).toBe(false);
    unmount();
  });

  it("returns empty buckets when caches API unavailable", async () => {
    vi.stubGlobal("caches", undefined);
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.buckets.value).toEqual([]);
    unmount();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/tests/unit/composable/useCacheStorage.test.ts
```

Expected: FAIL — `useCacheStorage is not a function` (not exported yet)

- [ ] **Step 3: Implement `useCacheStorage` with `loadCaches` and reactive state**

Append to `src/composable/useCacheStorage.ts` (after the helper functions):

```ts
import { computed, onMounted, onUnmounted, ref } from "vue";

export function useCacheStorage() {
  const buckets = ref<CacheBucket[]>([]);
  const isLoading = ref(false);
  const isCacheAvailable = ref(typeof window !== "undefined" && "caches" in window);
  const totalSizeBytes = computed(() =>
    buckets.value.reduce((sum, b) => sum + b.totalSizeBytes, 0),
  );

  async function loadCaches(): Promise<void> {
    if (!isCacheAvailable.value) return;
    isLoading.value = true;
    try {
      const cacheNames = await caches.keys();
      const results = await Promise.all(
        cacheNames.map(async (name): Promise<CacheBucket> => {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          const urls = requests.map((req) => req.url);

          let totalSizeBytes = 0;
          let lastModified: Date | null = null;

          for (const request of requests) {
            const response = await cache.match(request);
            if (!response) continue;

            try {
              const blob = await response.clone().blob();
              totalSizeBytes += blob.size;
            } catch {
              // opaque/CORS response — skip size
            }

            if (!lastModified) {
              const dateHeader = response.headers.get("Date");
              if (dateHeader) lastModified = new Date(dateHeader);
            }
          }

          return { name, entryCount: requests.length, totalSizeBytes, lastModified, urls };
        }),
      );
      buckets.value = results;
    } finally {
      isLoading.value = false;
    }
  }

  const onlineStatus = ref<"online" | "offline">(
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online",
  );

  onMounted(() => {
    const handleOnline = () => {
      onlineStatus.value = "online";
    };
    const handleOffline = () => {
      onlineStatus.value = "offline";
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    onUnmounted(() => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    });
  });

  return {
    buckets,
    isLoading,
    isCacheAvailable,
    totalSizeBytes,
    onlineStatus,
    loadCaches,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/tests/unit/composable/useCacheStorage.test.ts
```

Expected: PASS (all `loadCaches` and helper tests)

- [ ] **Step 5: Commit**

```bash
git add src/composable/useCacheStorage.ts src/tests/unit/composable/useCacheStorage.test.ts
git commit -m "feat: implement useCacheStorage loadCaches and reactive state"
```

---

### Task 3: `useCacheStorage` — actions (`clearBucket`, `clearAll`, `reSync`) + `onlineStatus`

**Files:**

- Modify: `src/composable/useCacheStorage.ts`
- Modify: `src/tests/unit/composable/useCacheStorage.test.ts`

- [ ] **Step 1: Add tests for actions and onlineStatus**

Append to `src/tests/unit/composable/useCacheStorage.test.ts`:

```ts
describe("useCacheStorage — clearBucket", () => {
  let mockCacheStorage: ReturnType<typeof makeMockCacheStorage>;

  beforeEach(() => {
    mockCacheStorage = makeMockCacheStorage({
      "api-search-index": [{ url: "https://example.com/api/search/index.json", size: 100 }],
      "api-word-of-the-day": [{ url: "https://example.com/api/wotd", size: 50 }],
    });
    vi.stubGlobal("caches", mockCacheStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls caches.delete with the bucket name", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.clearBucket("api-search-index");
    expect(mockCacheStorage.delete).toHaveBeenCalledWith("api-search-index");
    unmount();
  });

  it("reloads buckets after clearing", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.clearBucket("api-search-index");
    // caches.keys() was called again (second call = after clear)
    expect(mockCacheStorage.keys).toHaveBeenCalledTimes(2);
    unmount();
  });
});

describe("useCacheStorage — clearAll", () => {
  let mockCacheStorage: ReturnType<typeof makeMockCacheStorage>;

  beforeEach(() => {
    mockCacheStorage = makeMockCacheStorage({
      "api-search-index": [{ url: "https://example.com/a", size: 100 }],
      "workbox-precache-v2": [{ url: "https://example.com/b", size: 200 }],
    });
    vi.stubGlobal("caches", mockCacheStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes all cache buckets", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.clearAll();
    expect(mockCacheStorage.delete).toHaveBeenCalledWith("api-search-index");
    expect(mockCacheStorage.delete).toHaveBeenCalledWith("workbox-precache-v2");
    unmount();
  });

  it("reloads after clearing all", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.clearAll();
    expect(mockCacheStorage.keys).toHaveBeenCalledTimes(2);
    unmount();
  });
});

describe("useCacheStorage — onlineStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is "online" initially when navigator.onLine is true', () => {
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: null });
    const { result, unmount } = withSetup(() => useCacheStorage());
    expect(result.onlineStatus.value).toBe("online");
    unmount();
  });

  it('updates to "offline" on offline event', async () => {
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: null });
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    const { result, unmount } = withSetup(() => useCacheStorage());
    window.dispatchEvent(new Event("offline"));
    expect(result.onlineStatus.value).toBe("offline");
    unmount();
  });

  it('updates to "online" on online event', async () => {
    vi.stubGlobal("navigator", { onLine: false, serviceWorker: null });
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    const { result, unmount } = withSetup(() => useCacheStorage());
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
    expect(result.onlineStatus.value).toBe("online");
    unmount();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/tests/unit/composable/useCacheStorage.test.ts
```

Expected: FAIL — `result.clearBucket is not a function`, `result.clearAll is not a function`

- [ ] **Step 3: Add `clearBucket`, `clearAll`, `reSync` to the composable**

In `src/composable/useCacheStorage.ts`, add this import at the top:

```ts
import { createToastNotify } from "@stores/index";
```

Then add these functions inside `useCacheStorage()`, before the `return` statement:

```ts
async function clearBucket(name: string): Promise<void> {
  if (!isCacheAvailable.value) return;
  await caches.delete(name);
  await loadCaches();
}

async function clearAll(): Promise<void> {
  if (!isCacheAvailable.value) return;
  const names = await caches.keys();
  await Promise.all(names.map((name) => caches.delete(name)));
  await loadCaches();
}

function reSync(): void {
  createToastNotify({
    message: "Cache wird aktualisiert…",
    status: "info",
    showClose: false,
    timeout: 2000,
  });
  navigator.serviceWorker?.controller?.postMessage({ type: "SKIP_WAITING" });
  setTimeout(() => location.reload(), 800);
}
```

And add `clearBucket`, `clearAll`, `reSync` to the `return` object.

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/tests/unit/composable/useCacheStorage.test.ts
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/composable/useCacheStorage.ts src/tests/unit/composable/useCacheStorage.test.ts
git commit -m "feat: add clearBucket, clearAll, reSync and onlineStatus to useCacheStorage"
```

---

### Task 4: `PwaCacheOverview.vue` component

**Files:**

- Create: `src/components/PwaCacheOverview.vue`

The component is pure presentation over the composable — no unit test needed. The composable is fully tested.

- [ ] **Step 1: Create the component**

Create `src/components/PwaCacheOverview.vue`:

```vue
<template>
  <div class="c-pwa-cache">
    <div class="c-pwa-cache__header">
      <h1 class="c-pwa-cache__title">Offline-Cache</h1>
      <span
        class="c-pwa-cache__status"
        :class="onlineStatus === 'online' ? 'is-online' : 'is-offline'"
      >
        {{ onlineStatus === "online" ? "● Online" : "○ Offline" }}
      </span>
    </div>

    <div v-if="!isCacheAvailable" class="c-pwa-cache__unavailable">
      <p>Der Cache ist in diesem Browser nicht verfügbar (z.B. Privater Modus oder kein HTTPS).</p>
    </div>

    <template v-else>
      <div class="c-pwa-cache__stats">
        <div class="c-pwa-cache__stat">
          <span class="c-pwa-cache__stat-value">{{ buckets.length }}</span>
          <span class="c-pwa-cache__stat-label"
            >{{ buckets.length === 1 ? "Cache" : "Caches" }} gecacht</span
          >
        </div>
        <div class="c-pwa-cache__stat">
          <span class="c-pwa-cache__stat-value">{{ formatBytes(totalSizeBytes) }}</span>
          <span class="c-pwa-cache__stat-label">gesamt</span>
        </div>
      </div>

      <div class="c-pwa-cache__actions">
        <button
          type="button"
          class="c-button c-button--center-icon"
          :disabled="isLoading"
          @click="loadCaches"
        >
          <RefreshCw width="16" height="16" />
          Aktualisieren
        </button>
        <button
          type="button"
          class="c-button c-button--center-icon"
          :disabled="isLoading || buckets.length === 0"
          @click="confirmClearAll"
        >
          <Trash2 width="16" height="16" />
          Alles leeren
        </button>
        <button type="button" class="c-button c-button--center-icon" @click="reSync">
          <RotateCcw width="16" height="16" />
          Re-sync
        </button>
      </div>

      <div v-if="isLoading" class="c-pwa-cache__skeleton" aria-busy="true">
        <div v-for="n in 3" :key="n" class="c-pwa-cache__skeleton-row" />
      </div>

      <div v-else-if="buckets.length === 0" class="c-pwa-cache__empty">
        <p>Noch nichts gecacht.</p>
      </div>

      <ul v-else class="c-pwa-cache__list u-list-reset">
        <li v-for="bucket in buckets" :key="bucket.name" class="c-pwa-cache__bucket">
          <div class="c-pwa-cache__bucket-header">
            <span class="c-pwa-cache__bucket-name">
              {{ getBucketDisplayName(bucket.name) }}
            </span>
            <span class="c-pwa-cache__bucket-size">
              {{ formatBytes(bucket.totalSizeBytes) }}
            </span>
            <button
              type="button"
              class="c-pwa-cache__bucket-delete"
              :aria-label="`${getBucketDisplayName(bucket.name)} leeren`"
              @click="confirmClearBucket(bucket.name)"
            >
              <X width="16" height="16" />
            </button>
          </div>
          <div class="c-pwa-cache__bucket-meta">
            {{ bucket.entryCount }} {{ bucket.entryCount === 1 ? "Eintrag" : "Einträge" }}
            <template v-if="bucket.lastModified">
              · zuletzt: {{ formatRelativeTime(bucket.lastModified) }}
            </template>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { open } from "@stores/modal";
import { formatBytes, getBucketDisplayName, useCacheStorage } from "@composables/useCacheStorage";
import RefreshCw from "virtual:icons/lucide/refresh-cw";
import RotateCcw from "virtual:icons/lucide/rotate-ccw";
import Trash2 from "virtual:icons/lucide/trash-2";
import X from "virtual:icons/lucide/x";
import { defineAsyncComponent, onMounted } from "vue";

const {
  buckets,
  isLoading,
  isCacheAvailable,
  totalSizeBytes,
  onlineStatus,
  loadCaches,
  clearBucket,
  clearAll,
  reSync,
} = useCacheStorage();

onMounted(() => {
  loadCaches();
});

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return "gerade eben";
  if (hours < 1) return `vor ${minutes} Min.`;
  if (days < 1) return `vor ${hours} Std.`;
  return `vor ${days} Tg.`;
}

function confirmClearBucket(name: string): void {
  open({
    props: { width: "400px" },
    view: {
      component: defineAsyncComponent(() => import("@components/ConfirmDialog.vue")),
      props: {
        message: `Cache „${getBucketDisplayName(name)}" wirklich leeren?`,
        confirmLabel: "Leeren",
      },
      events: {
        confirm: () => clearBucket(name),
      },
    },
  });
}

function confirmClearAll(): void {
  open({
    props: { width: "400px" },
    view: {
      component: defineAsyncComponent(() => import("@components/ConfirmDialog.vue")),
      props: {
        message: "Alle Caches wirklich leeren?",
        confirmLabel: "Alle leeren",
      },
      events: {
        confirm: () => clearAll(),
      },
    },
  });
}
</script>

<style lang="scss">
@use "@styles/components/pwa-cache";
</style>
```

> **Note on `ConfirmDialog.vue`:** Check whether a generic confirm dialog component already exists in `src/components/`. If it does not exist, replace the `confirmClearBucket` and `confirmClearAll` functions to use `window.confirm()` directly and skip the `open()` call:
>
> ```ts
> function confirmClearBucket(name: string): void {
>   if (window.confirm(`Cache „${getBucketDisplayName(name)}" wirklich leeren?`)) {
>     clearBucket(name);
>   }
> }
>
> function confirmClearAll(): void {
>   if (window.confirm("Alle Caches wirklich leeren?")) {
>     clearAll();
>   }
> }
> ```

- [ ] **Step 2: Create the SCSS file**

Create `src/styles/components/_pwa-cache.scss`:

```scss
.c-pwa-cache {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-block-end: 1.5rem;
  }

  &__title {
    margin: 0;
  }

  &__status {
    font-size: 0.875rem;
    font-weight: 600;

    &.is-online {
      color: var(--color-success, #4caf50);
    }
    &.is-offline {
      color: var(--color-error, #f44336);
    }
  }

  &__stats {
    display: flex;
    gap: 1rem;
    margin-block-end: 1.5rem;
  }

  &__stat {
    display: flex;
    flex-direction: column;
    padding: 0.75rem 1rem;
    background: var(--color-surface-2, #1e2a35);
    border-radius: 0.5rem;
    min-width: 8rem;
  }

  &__stat-value {
    font-size: 1.5rem;
    font-weight: 700;
  }

  &__stat-label {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  &__actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-block-end: 2rem;
  }

  &__skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__skeleton-row {
    height: 4rem;
    border-radius: 0.5rem;
    background: var(--color-surface-2, #1e2a35);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  &__empty {
    padding: 2rem;
    text-align: center;
    opacity: 0.6;
  }

  &__unavailable {
    padding: 1rem;
    background: var(--color-surface-2, #1e2a35);
    border-radius: 0.5rem;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__bucket {
    padding: 0.75rem 1rem;
    background: var(--color-surface-2, #1e2a35);
    border-radius: 0.5rem;
  }

  &__bucket-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-block-end: 0.25rem;
  }

  &__bucket-name {
    flex: 1;
    font-weight: 600;
  }

  &__bucket-size {
    font-size: 0.875rem;
    opacity: 0.8;
  }

  &__bucket-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 0.25rem;
    color: inherit;
    opacity: 0.6;

    &:hover {
      opacity: 1;
    }
  }

  &__bucket-meta {
    font-size: 0.8rem;
    opacity: 0.6;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm typechecking
```

Fix any type errors before proceeding.

- [ ] **Step 4: Commit**

```bash
git add src/components/PwaCacheOverview.vue src/styles/components/_pwa-cache.scss
git commit -m "feat: add PwaCacheOverview Vue component and SCSS"
```

---

### Task 5: Astro page + footer link

**Files:**

- Create: `src/pages/pwa.astro`
- Modify: `src/components/Footer.astro`

- [ ] **Step 1: Create the Astro page**

Create `src/pages/pwa.astro`:

```astro
---
import PwaCacheOverview from '@components/PwaCacheOverview.vue'
import Layout from '@layouts/Layout.astro'

const page = {
  title: 'Offline-Cache – Berliner Schnauze',
  description: 'Verwalte den Offline-Cache der Berliner Schnauze App.',
}
---

<Layout content={page}>
  <PwaCacheOverview client:only="vue" />
</Layout>
```

- [ ] **Step 2: Add footer link**

In `src/components/Footer.astro`, add `/pwa` to `navMenu1` (the "Seiten" list):

```ts
const navMenu1 = [
  {
    link: "/wort-vorschlagen",
    title: "Wort vorschlagen",
  },
  {
    link: "/wort",
    title: "Wort Index",
  },
  {
    link: "/pwa",
    title: "Offline-Cache",
  },
  {
    link: "https://github.com/felix-berlin/berliner-schnauze/releases",
    title: "Changelog",
  },
  {
    link: "https://github.com/felix-berlin/berliner-schnauze/issues/new",
    title: "tech. Fehler melden",
  },
];
```

- [ ] **Step 3: Build and verify**

```bash
pnpm build
```

Expected: build completes without errors. The route `/pwa` should appear in the output.

If you see TypeScript errors about the SCSS import in `PwaCacheOverview.vue`, make sure `_pwa-cache.scss` exists at `src/styles/components/_pwa-cache.scss`.

- [ ] **Step 4: Run all tests**

```bash
pnpm test:unit
```

Expected: all tests pass including the new composable tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/pwa.astro src/components/Footer.astro
git commit -m "feat: add /pwa page and footer link for offline cache overview"
```

---

## Spec Coverage Check

| Spec requirement                                     | Task      |
| ---------------------------------------------------- | --------- |
| `/pwa` Astro page                                    | Task 5    |
| `PwaCacheOverview.vue` client:only="vue"             | Task 4    |
| `useCacheStorage` composable                         | Tasks 2–3 |
| `CacheBucket` type                                   | Task 1    |
| `loadCaches()` with size + lastModified              | Task 2    |
| `clearAll()`                                         | Task 3    |
| `clearBucket(name)`                                  | Task 3    |
| `reSync()` with toast + postMessage                  | Task 3    |
| `onlineStatus` reactive                              | Task 2–3  |
| `formatBytes()` helper                               | Task 1    |
| `getBucketDisplayName()` mapping                     | Task 1    |
| Cache unavailable banner                             | Task 4    |
| Opaque response error handling (try/catch in blob()) | Task 2    |
| Empty state UI                                       | Task 4    |
| Loading skeleton                                     | Task 4    |
| Confirm dialogs for delete                           | Task 4    |
| Toast before reSync                                  | Task 3    |
| Footer link                                          | Task 5    |
| Tests for all composable logic                       | Tasks 1–3 |
