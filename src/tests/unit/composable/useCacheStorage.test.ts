import { formatBytes, getBucketDisplayName } from "@composables/useCacheStorage";
import { useCacheStorage } from "@composables/useCacheStorage";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp, nextTick } from "vue";

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
    expect(wotd.oldestEntry).toBeNull();
    unmount();
  });

  it("tracks oldest and newest entry dates across multiple entries", async () => {
    vi.stubGlobal(
      "caches",
      makeMockCacheStorage({
        "api-search-index": [
          { url: "https://example.com/a", size: 100, dateStr: "Thu, 01 Jan 2026 08:00:00 GMT" },
          { url: "https://example.com/b", size: 100, dateStr: "Thu, 01 Jan 2026 12:00:00 GMT" },
        ],
      }),
    );
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    const bucket = result.buckets.value.find((b) => b.name === "api-search-index")!;
    expect(bucket.lastModified?.toISOString()).toBe("2026-01-01T12:00:00.000Z");
    expect(bucket.oldestEntry?.toISOString()).toBe("2026-01-01T08:00:00.000Z");
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
    // caches.keys() was called once (inside loadCaches after clear)
    expect(mockCacheStorage.keys).toHaveBeenCalledTimes(1);
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
    vi.restoreAllMocks();
  });

  it('resolves "online" when fetch succeeds', async () => {
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const { result, unmount } = withSetup(() => useCacheStorage());
    await nextTick();
    expect(result.onlineStatus.value).toBe("online");
    unmount();
  });

  it('resolves "offline" when fetch fails', async () => {
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: null });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const { result, unmount } = withSetup(() => useCacheStorage());
    await nextTick();
    expect(result.onlineStatus.value).toBe("offline");
    unmount();
  });

  it('resolves "offline" without fetch when navigator.onLine is false', async () => {
    vi.stubGlobal("navigator", { onLine: false, serviceWorker: null });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { result, unmount } = withSetup(() => useCacheStorage());
    await nextTick();
    expect(result.onlineStatus.value).toBe("offline");
    expect(fetchSpy).not.toHaveBeenCalled();
    unmount();
  });

  it('updates to "offline" on offline event', () => {
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    const { result, unmount } = withSetup(() => useCacheStorage());
    window.dispatchEvent(new Event("offline"));
    expect(result.onlineStatus.value).toBe("offline");
    unmount();
  });

  it('updates to "online" on online event', () => {
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    const { result, unmount } = withSetup(() => useCacheStorage());
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
    expect(result.onlineStatus.value).toBe("online");
    unmount();
  });
});

describe("useCacheStorage — storageQuota", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("populates storageQuota from navigator.storage.estimate", async () => {
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    vi.stubGlobal("navigator", {
      onLine: true,
      serviceWorker: { getRegistration: vi.fn().mockResolvedValue(null) },
      storage: { estimate: vi.fn().mockResolvedValue({ usage: 1024, quota: 1_000_000 }) },
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.storageQuota.value).toEqual({ usedBytes: 1024, quotaBytes: 1_000_000 });
    unmount();
  });

  it("leaves storageQuota null when estimate unavailable", async () => {
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    vi.stubGlobal("navigator", {
      onLine: true,
      serviceWorker: { getRegistration: vi.fn().mockResolvedValue(null) },
      storage: {},
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.storageQuota.value).toBeNull();
    unmount();
  });
});

describe("useCacheStorage — swInfo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports active when SW registration is active", async () => {
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    vi.stubGlobal("navigator", {
      onLine: true,
      storage: { estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }) },
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({
          active: { scriptURL: "https://example.com/sw.js", state: "activated" },
          waiting: null,
          installing: null,
          scope: "https://example.com/",
        }),
      },
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.swInfo.value?.status).toBe("active");
    expect(result.swInfo.value?.scriptURL).toBe("https://example.com/sw.js");
    unmount();
  });

  it("reports not-registered when no SW registration found", async () => {
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    vi.stubGlobal("navigator", {
      onLine: true,
      storage: { estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }) },
      serviceWorker: { getRegistration: vi.fn().mockResolvedValue(null) },
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.swInfo.value?.status).toBe("not-registered");
    unmount();
  });

  it("reports not-supported when serviceWorker absent from navigator", async () => {
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    vi.stubGlobal("navigator", {
      onLine: true,
      storage: { estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }) },
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.swInfo.value?.status).toBe("not-supported");
    unmount();
  });
});
