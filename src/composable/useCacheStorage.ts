import { useEventListener, useTimeoutFn } from "@vueuse/core";
import { createToastNotify } from "@stores/index";
import { computed, onMounted, ref } from "vue";

export interface CacheEntry {
  contentType: string | null;
  date: Date | null;
  size: number | null;
  url: string;
}

export interface FileTypeBreakdown {
  count: number;
  sizeBytes: number;
  type: string;
}

export interface CacheBucket {
  lastModified: Date | null;
  name: string;
  oldestEntry: Date | null;
  totalSizeBytes: number;
  typeBreakdown: FileTypeBreakdown[];
  urls: CacheEntry[];
}

export interface StorageQuota {
  usedBytes: number;
  quotaBytes: number;
}

export type SwStatus = "not-supported" | "not-registered" | "installing" | "waiting" | "active";

export type SwInfo =
  | { status: "not-supported" | "not-registered" }
  | { status: "installing" | "waiting" | "active"; scriptURL: string; scope: string };

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

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  "application/javascript": "js",
  "application/json": "json",
  "font/woff": "woff",
  "font/woff2": "woff2",
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
  "text/css": "css",
  "text/html": "html",
  "text/javascript": "js",
};

export function getEntryType(url: string, contentType: string | null): string {
  if (contentType) {
    const type = contentType.split(";")[0].trim();
    if (CONTENT_TYPE_TO_EXT[type]) return CONTENT_TYPE_TO_EXT[type];
  }
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split("/").pop() ?? "";
    const dotIndex = lastSegment.lastIndexOf(".");
    if (dotIndex < 1) return "other";
    const ext = lastSegment.slice(dotIndex + 1).toLowerCase();
    return ext.length > 0 && ext.length <= 6 ? ext : "other";
  } catch {
    return "other";
  }
}

export function useCacheStorage() {
  const buckets = ref<CacheBucket[]>([]);
  const isLoading = ref(false);
  const loadError = ref<string | null>(null);
  const storageQuota = ref<StorageQuota | null>(null);
  const swInfo = ref<SwInfo | null>(null);

  const isCacheAvailable = typeof window !== "undefined" && "caches" in window;
  const totalSizeBytes = computed(() =>
    buckets.value.reduce((sum, b) => sum + b.totalSizeBytes, 0),
  );

  async function loadStorageQuota(): Promise<void> {
    if (!navigator.storage?.estimate) return;
    try {
      const est = await navigator.storage.estimate();
      if (typeof est.usage === "number" && typeof est.quota === "number") {
        storageQuota.value = { quotaBytes: est.quota, usedBytes: est.usage };
      }
    } catch {
      // storage.estimate() blocked by permissions policy or unavailable
    }
  }

  async function loadSwInfo(): Promise<void> {
    if (!("serviceWorker" in navigator)) {
      swInfo.value = { status: "not-supported" };
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg || (!reg.installing && !reg.waiting && !reg.active)) {
        swInfo.value = { status: "not-registered" };
        return;
      }
      const status: "installing" | "waiting" | "active" = reg.installing
        ? "installing"
        : reg.waiting
          ? "waiting"
          : "active";
      const worker = reg.active ?? reg.waiting ?? reg.installing;
      swInfo.value = {
        scope: reg.scope ?? "",
        scriptURL: worker?.scriptURL ?? "",
        status,
      };
    } catch {
      swInfo.value = { status: "not-registered" };
    }
  }

  async function loadCaches(): Promise<void> {
    if (typeof caches === "undefined" || !caches) return;
    isLoading.value = true;
    loadError.value = null;
    try {
      const [cacheNames] = await Promise.all([caches.keys(), loadStorageQuota(), loadSwInfo()]);
      const settled = await Promise.allSettled(
        cacheNames.map(async (name): Promise<CacheBucket> => {
          const cache = await caches.open(name);
          if (!cache)
            return { lastModified: null, name, oldestEntry: null, totalSizeBytes: 0, typeBreakdown: [], urls: [] };

          const requests = await cache.keys();

          let totalSizeBytes = 0;
          let lastModified: Date | null = null;
          let oldestEntry: Date | null = null;

          const urls = await Promise.all(
            requests.map(async (request): Promise<CacheEntry> => {
              const url = request.url;
              const response = await cache.match(request);
              if (!response) return { contentType: null, date: null, size: null, url };

              let size: number | null = null;
              try {
                const blob = await response.clone().blob();
                size = blob.size;
                totalSizeBytes += blob.size;
              } catch {
                // opaque/CORS response — skip size
              }

              const contentType = response.headers.get("Content-Type");
              const dateHeader = response.headers.get("Date");
              if (!dateHeader) return { contentType, date: null, size, url };
              const date = new Date(dateHeader);
              if (!lastModified || date > lastModified) lastModified = date;
              if (!oldestEntry || date < oldestEntry) oldestEntry = date;
              return { contentType, date, size, url };
            }),
          );

          const typeMap = new Map<string, FileTypeBreakdown>();
          for (const entry of urls) {
            const type = getEntryType(entry.url, entry.contentType);
            const existing = typeMap.get(type) ?? { count: 0, sizeBytes: 0, type };
            existing.count++;
            existing.sizeBytes += entry.size ?? 0;
            typeMap.set(type, existing);
          }
          const typeBreakdown = [...typeMap.values()].sort((a, b) => b.sizeBytes - a.sizeBytes);

          return { lastModified, name, oldestEntry, totalSizeBytes, typeBreakdown, urls };
        }),
      );
      buckets.value = settled
        .filter((r): r is PromiseFulfilledResult<CacheBucket> => r.status === "fulfilled")
        .map((r) => r.value);
    } catch {
      loadError.value = "Cache-Daten konnten nicht geladen werden.";
    } finally {
      isLoading.value = false;
    }
  }

  const onlineStatus = ref<"online" | "offline">("online");

  async function verifyConnectivity(): Promise<void> {
    if (!navigator.onLine) {
      onlineStatus.value = "offline";
      return;
    }
    try {
      // HEAD bypasses Workbox precache (GET-only); /ping is a static file so SW never caches it
      await fetch("/ping", {
        method: "HEAD",
        signal: AbortSignal.timeout(3000),
      });
      onlineStatus.value = "online";
    } catch {
      onlineStatus.value = "offline";
    }
  }

  const handleOnline = () => {
    void verifyConnectivity();
  };
  const handleOffline = () => {
    onlineStatus.value = "offline";
  };

  const { start: scheduleReload } = useTimeoutFn(() => location.reload(), 2100, { immediate: false });

  useEventListener(window, "online", handleOnline);
  useEventListener(window, "offline", handleOffline);

  onMounted(() => {
    void verifyConnectivity();
  });

  async function clearBucket(name: string): Promise<void> {
    if (typeof caches === "undefined" || !caches) return;
    try {
      await caches.delete(name);
    } catch {
      createToastNotify({
        message: `Cache „${getBucketDisplayName(name)}" konnte nicht geleert werden.`,
        status: "error",
      });
      return;
    }
    await loadCaches();
  }

  async function clearAll(): Promise<void> {
    if (typeof caches === "undefined" || !caches) return;
    try {
      const names = await caches.keys();
      const results = await Promise.allSettled(names.map((name) => caches.delete(name)));
      const failCount = results.filter((r) => r.status === "rejected").length;
      if (failCount > 0) {
        createToastNotify({
          message: `${failCount} Cache(s) konnten nicht geleert werden.`,
          status: "error",
        });
      }
    } catch {
      createToastNotify({
        message: "Caches konnten nicht geleert werden.",
        status: "error",
      });
    }
    await loadCaches();
  }

  function reSync(): void {
    createToastNotify({
      message: "Cache wird aktualisiert…",
      showClose: false,
      status: "info",
      timeout: 2000,
    });
    scheduleReload();
  }

  return {
    buckets,
    clearAll,
    clearBucket,
    isCacheAvailable,
    isLoading,
    loadCaches,
    loadError,
    onlineStatus,
    reSync,
    storageQuota,
    swInfo,
    totalSizeBytes,
  };
}
