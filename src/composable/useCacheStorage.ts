import { createToastNotify } from "@stores/index";
import { computed, onMounted, onUnmounted, ref } from "vue";

export interface CacheBucket {
  name: string;
  entryCount: number;
  totalSizeBytes: number;
  lastModified: Date | null;
  oldestEntry: Date | null;
  urls: string[];
}

export interface StorageQuota {
  usedBytes: number;
  quotaBytes: number;
}

export type SwStatus = "not-supported" | "not-registered" | "installing" | "waiting" | "active";

export interface SwInfo {
  status: SwStatus;
  scriptURL: string | null;
  scope: string | null;
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

export function useCacheStorage() {
  const buckets = ref<CacheBucket[]>([]);
  const isLoading = ref(false);
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
      storageQuota.value = { quotaBytes: est.quota ?? 0, usedBytes: est.usage ?? 0 };
    } catch {
      // API unavailable
    }
  }

  async function loadSwInfo(): Promise<void> {
    if (!("serviceWorker" in navigator)) {
      swInfo.value = { scope: null, scriptURL: null, status: "not-supported" };
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        swInfo.value = { scope: null, scriptURL: null, status: "not-registered" };
        return;
      }
      const status: SwStatus = reg.installing
        ? "installing"
        : reg.waiting
          ? "waiting"
          : reg.active
            ? "active"
            : "not-registered";
      const worker = reg.active ?? reg.waiting ?? reg.installing;
      swInfo.value = { scope: reg.scope ?? null, scriptURL: worker?.scriptURL ?? null, status };
    } catch {
      swInfo.value = { scope: null, scriptURL: null, status: "not-registered" };
    }
  }

  async function loadCaches(): Promise<void> {
    if (typeof caches === "undefined" || !caches) return;
    isLoading.value = true;
    try {
      const [cacheNames] = await Promise.all([caches.keys(), loadStorageQuota(), loadSwInfo()]);
      const results = await Promise.all(
        cacheNames.map(async (name): Promise<CacheBucket> => {
          const cache = await caches.open(name);
          if (!cache)
            return {
              entryCount: 0,
              lastModified: null,
              name,
              oldestEntry: null,
              totalSizeBytes: 0,
              urls: [],
            };
          const requests = await cache.keys();
          const urls = requests.map((req) => req.url);

          let totalSizeBytes = 0;
          let lastModified: Date | null = null;
          let oldestEntry: Date | null = null;

          for (const request of requests) {
            const response = await cache.match(request);
            if (!response) continue;

            try {
              const blob = await response.clone().blob();
              totalSizeBytes += blob.size;
            } catch {
              // opaque/CORS response — skip size
            }

            const dateHeader = response.headers.get("Date");
            if (dateHeader) {
              const date = new Date(dateHeader);
              if (!lastModified || date > lastModified) lastModified = date;
              if (!oldestEntry || date < oldestEntry) oldestEntry = date;
            }
          }

          return {
            entryCount: requests.length,
            lastModified,
            name,
            oldestEntry,
            totalSizeBytes,
            urls,
          };
        }),
      );
      buckets.value = results;
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
      // HEAD request bypasses Workbox precache (GET-only) so DevTools offline blocks it
      await fetch("/favicon.ico", {
        cache: "no-store",
        method: "HEAD",
        signal: AbortSignal.timeout(2000),
      });
      onlineStatus.value = "online";
    } catch {
      onlineStatus.value = "offline";
    }
  }

  const handleOnline = () => {
    onlineStatus.value = "online";
  };
  const handleOffline = () => {
    onlineStatus.value = "offline";
  };

  onMounted(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    void verifyConnectivity();
  });

  onUnmounted(() => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  });

  async function clearBucket(name: string): Promise<void> {
    if (typeof caches === "undefined" || !caches) return;
    await caches.delete(name);
    await loadCaches();
  }

  async function clearAll(): Promise<void> {
    if (typeof caches === "undefined" || !caches) return;
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    await loadCaches();
  }

  function reSync(): void {
    createToastNotify({
      message: "Cache wird aktualisiert…",
      showClose: false,
      status: "info",
      timeout: 2000,
    });
    setTimeout(() => location.reload(), 800);
  }

  return {
    buckets,
    clearAll,
    clearBucket,
    isCacheAvailable,
    isLoading,
    loadCaches,
    onlineStatus,
    reSync,
    storageQuota,
    swInfo,
    totalSizeBytes,
  };
}
