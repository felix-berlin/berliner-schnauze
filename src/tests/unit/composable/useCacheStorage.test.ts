import { formatBytes, getBucketDisplayName, getEntryType } from "@composables/useCacheStorage";
import { useCacheStorage } from "@composables/useCacheStorage";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp, nextTick } from "vue";
import { createToastNotify } from "@stores/toastNotify.ts";

vi.mock("@stores/index", () => ({ createToastNotify: vi.fn() }));
vi.mock("@stores/toastNotify.ts", () => ({ createToastNotify: vi.fn() }));

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
  data: Record<string, Array<{ url: string; dateStr?: string; size?: number; contentType?: string }>>,
) {
  const cacheInstances = Object.fromEntries(
    Object.entries(data).map(([name, entries]) => {
      const requests = entries.map((e) => new Request(e.url));
      const responseMap = new Map(
        entries.map((e) => {
          const headers: Record<string, string> = {};
          if (e.dateStr) headers.Date = e.dateStr;
          if (e.contentType) headers["Content-Type"] = e.contentType;
          return [e.url, new Response(new Uint8Array(e.size ?? 100), { headers })];
        }),
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

describe("getEntryType", () => {
  it("prefers Content-Type over URL extension", () => {
    expect(getEntryType("https://example.com/data.json", "application/javascript")).toBe("js");
  });

  it("strips charset suffix from Content-Type", () => {
    expect(getEntryType("https://example.com/page", "text/html; charset=utf-8")).toBe("html");
  });

  it("falls through to URL extension when contentType is null", () => {
    expect(getEntryType("https://example.com/app.js", null)).toBe("js");
  });

  it("returns other when URL has no dot", () => {
    expect(getEntryType("https://example.com/pwa", null)).toBe("other");
  });

  it("returns other for dot at position 0 (.hidden files)", () => {
    expect(getEntryType("https://example.com/.hidden", null)).toBe("other");
  });

  it("returns other for extension longer than 6 chars", () => {
    expect(getEntryType("https://example.com/file.toolong", null)).toBe("other");
  });

  it("returns other for unknown Content-Type with no URL extension", () => {
    expect(getEntryType("https://example.com/api/data", "application/x-custom-type")).toBe("other");
  });

  it("returns other for malformed URL", () => {
    expect(getEntryType("not a url at all", null)).toBe("other");
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

  it("counts entries per bucket via urls.length", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    const idx = result.buckets.value.find((b) => b.name === "api-search-index")!;
    expect(idx.urls.length).toBe(1);
    unmount();
  });

  it("sums total size in bytes", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    const idx = result.buckets.value.find((b) => b.name === "api-search-index")!;
    expect(idx.totalSizeBytes).toBe(1024);
    unmount();
  });

  it("reads lastModified from Date header via dateRange", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    const idx = result.buckets.value.find((b) => b.name === "api-search-index")!;
    expect(idx.dateRange?.lastModified).toBeInstanceOf(Date);
    expect(idx.dateRange?.lastModified.toISOString()).toBe("2026-01-01T10:00:00.000Z");
    unmount();
  });

  it("sets dateRange to null when no Date header", async () => {
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    const wotd = result.buckets.value.find((b) => b.name === "api-word-of-the-day")!;
    expect(wotd.dateRange).toBeNull();
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
    expect(bucket.dateRange?.lastModified.toISOString()).toBe("2026-01-01T12:00:00.000Z");
    expect(bucket.dateRange?.oldestEntry.toISOString()).toBe("2026-01-01T08:00:00.000Z");
    unmount();
  });

  it("three entries covers both dateRange update branches (lines 196-197)", async () => {
    vi.stubGlobal(
      "caches",
      makeMockCacheStorage({
        "api-search-index": [
          { url: "https://example.com/a", size: 100, dateStr: "Thu, 01 Jan 2026 08:00:00 GMT" },
          { url: "https://example.com/b", size: 100, dateStr: "Thu, 01 Jan 2026 12:00:00 GMT" },
          { url: "https://example.com/c", size: 100, dateStr: "Thu, 01 Jan 2026 06:00:00 GMT" },
        ],
      }),
    );
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    const bucket = result.buckets.value.find((b) => b.name === "api-search-index")!;
    expect(bucket.dateRange?.lastModified.toISOString()).toBe("2026-01-01T12:00:00.000Z");
    expect(bucket.dateRange?.oldestEntry.toISOString()).toBe("2026-01-01T06:00:00.000Z");
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

  it("populates typeBreakdown sorted descending by sizeBytes", async () => {
    vi.stubGlobal(
      "caches",
      makeMockCacheStorage({
        "api-search-index": [
          { url: "https://example.com/a.js", size: 500, contentType: "application/javascript" },
          { url: "https://example.com/b.css", size: 200, contentType: "text/css" },
        ],
      }),
    );
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    const bucket = result.buckets.value.find((b) => b.name === "api-search-index")!;
    expect(bucket.typeBreakdown[0].type).toBe("js");
    expect(bucket.typeBreakdown[0].sizeBytes).toBe(500);
    expect(bucket.typeBreakdown[1].type).toBe("css");
    unmount();
  });

  it("aggregates count and sizeBytes for same type", async () => {
    vi.stubGlobal(
      "caches",
      makeMockCacheStorage({
        "api-search-index": [
          { url: "https://example.com/a.json", size: 300, contentType: "application/json" },
          { url: "https://example.com/b.json", size: 200, contentType: "application/json" },
        ],
      }),
    );
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    const bucket = result.buckets.value.find((b) => b.name === "api-search-index")!;
    expect(bucket.typeBreakdown).toHaveLength(1);
    expect(bucket.typeBreakdown[0].count).toBe(2);
    expect(bucket.typeBreakdown[0].sizeBytes).toBe(500);
    unmount();
  });
});

describe("useCacheStorage — cache entry edge cases", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const stubCachesWith = (cacheData: {
    keys: ReturnType<typeof vi.fn>;
    match: ReturnType<typeof vi.fn>;
  }) => {
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue(["test-cache"]),
      open: vi.fn().mockResolvedValue({ ...cacheData, delete: vi.fn().mockResolvedValue(true) }),
      delete: vi.fn(),
      has: vi.fn(),
      match: vi.fn(),
    });
    vi.stubGlobal("navigator", {
      onLine: true,
      storage: { estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }) },
      serviceWorker: { getRegistration: vi.fn().mockResolvedValue(null) },
    });
  };

  it("returns null fields when cache.match returns null (covers line 168 !response branch)", async () => {
    stubCachesWith({
      keys: vi.fn().mockResolvedValue([new Request("https://example.com/file.js")]),
      match: vi.fn().mockResolvedValue(null),
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    const bucket = result.buckets.value.find((b) => b.name === "test-cache")!;
    expect(bucket.urls[0]).toMatchObject({ contentType: null, date: null, size: null });
    unmount();
  });

  it("logs warning when blob() throws non-TypeError (covers lines 175-176 warn branch)", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mockResponse = {
      clone: vi.fn().mockReturnValue({
        blob: vi.fn().mockRejectedValue(new Error("network error")),
      }),
      headers: { get: vi.fn().mockReturnValue(null) },
    };
    stubCachesWith({
      keys: vi.fn().mockResolvedValue([new Request("https://example.com/file.js")]),
      match: vi.fn().mockResolvedValue(mockResponse),
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unexpected blob()"),
      expect.anything(),
      expect.anything(),
    );
    consoleSpy.mockRestore();
    unmount();
  });

  it("silently ignores TypeError from blob() (covers line 175 false branch)", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mockResponse = {
      clone: vi.fn().mockReturnValue({
        blob: vi.fn().mockRejectedValue(new TypeError("aborted")),
      }),
      headers: { get: vi.fn().mockReturnValue(null) },
    };
    stubCachesWith({
      keys: vi.fn().mockResolvedValue([new Request("https://example.com/file.js")]),
      match: vi.fn().mockResolvedValue(mockResponse),
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    unmount();
  });

  it("returns null date for invalid Date header (covers line 184 isNaN branch)", async () => {
    stubCachesWith({
      keys: vi.fn().mockResolvedValue([new Request("https://example.com/file.js")]),
      match: vi.fn().mockResolvedValue(
        new Response(new Uint8Array(100), { headers: { Date: "not-a-valid-date" } }),
      ),
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    const bucket = result.buckets.value.find((b) => b.name === "test-cache")!;
    expect(bucket.urls[0].date).toBeNull();
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

  it("clearAll returns early when caches is undefined (covers line 266)", async () => {
    vi.unstubAllGlobals();
    const { result, unmount } = withSetup(() => useCacheStorage());
    await expect(result.clearAll()).resolves.toBeUndefined();
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

  it('updates to "offline" on offline event', async () => {
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    const { result, unmount } = withSetup(() => useCacheStorage());
    window.dispatchEvent(new Event("offline"));
    // useOnline is consumed via watch() — flush the watcher before asserting
    await nextTick();
    expect(result.onlineStatus.value).toBe("offline");
    unmount();
  });

  it('updates to "online" on online event', async () => {
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    const { result, unmount } = withSetup(() => useCacheStorage());
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
    await Promise.resolve();
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
    expect(result.swInfo.value).toMatchObject({
      status: "active",
      scriptURL: "https://example.com/sw.js",
      scope: "https://example.com/",
    });
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

  it("reports waiting when reg.waiting is set and reg.installing is null", async () => {
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    vi.stubGlobal("navigator", {
      onLine: true,
      storage: { estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }) },
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({
          active: null,
          waiting: { scriptURL: "https://example.com/sw.js" },
          installing: null,
          scope: "https://example.com/",
        }),
      },
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.swInfo.value).toMatchObject({ status: "waiting", scriptURL: "https://example.com/sw.js" });
    unmount();
  });

  it("reports installing when reg.installing is set", async () => {
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    vi.stubGlobal("navigator", {
      onLine: true,
      storage: { estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }) },
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({
          active: null,
          waiting: null,
          installing: { scriptURL: "https://example.com/sw.js" },
          scope: "https://example.com/",
        }),
      },
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.swInfo.value).toMatchObject({ status: "installing" });
    unmount();
  });

  it("reports not-registered when getRegistration throws", async () => {
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    vi.stubGlobal("navigator", {
      onLine: true,
      storage: { estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }) },
      serviceWorker: { getRegistration: vi.fn().mockRejectedValue(new Error("SW error")) },
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.swInfo.value?.status).toBe("not-registered");
    unmount();
  });

  it("uses '' fallback for scriptURL when worker.scriptURL is null (covers line 141 ?? '' branch)", async () => {
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    vi.stubGlobal("navigator", {
      onLine: true,
      storage: { estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }) },
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({
          active: { scriptURL: null },
          waiting: null,
          installing: null,
          scope: "https://example.com/",
        }),
      },
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.swInfo.value).toMatchObject({ status: "active", scriptURL: "" });
    unmount();
  });
});

describe("useCacheStorage — loadCaches error handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets loadError when caches.keys() throws", async () => {
    vi.stubGlobal("caches", {
      keys: vi.fn().mockRejectedValue(new DOMException("SecurityError")),
      open: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
      match: vi.fn(),
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.loadError.value).toBeTruthy();
    unmount();
  });

  it("resets isLoading to false when caches.keys() throws", async () => {
    vi.stubGlobal("caches", {
      keys: vi.fn().mockRejectedValue(new DOMException("SecurityError")),
      open: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
      match: vi.fn(),
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.isLoading.value).toBe(false);
    unmount();
  });
});

describe("useCacheStorage — storageQuota error handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("leaves storageQuota null when estimate throws", async () => {
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    vi.stubGlobal("navigator", {
      onLine: true,
      serviceWorker: { getRegistration: vi.fn().mockResolvedValue(null) },
      storage: { estimate: vi.fn().mockRejectedValue(new DOMException("NotAllowedError")) },
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(result.storageQuota.value).toBeNull();
    unmount();
  });
});

describe("useCacheStorage — clearBucket guard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is a safe no-op when caches API unavailable", async () => {
    vi.stubGlobal("caches", undefined);
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.clearBucket("api-search-index");
    expect(result.buckets.value).toEqual([]);
    unmount();
  });
});

describe("useCacheStorage — reSync", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("schedules page reload after 2100 ms", () => {
    vi.useFakeTimers();
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { reload: reloadSpy });
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    const { result, unmount } = withSetup(() => useCacheStorage());
    result.reSync();
    expect(reloadSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2100);
    expect(reloadSpy).toHaveBeenCalledOnce();
    unmount();
  });

  it("cancels reload timer on unmount", () => {
    vi.useFakeTimers();
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { reload: reloadSpy });
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    const { result, unmount } = withSetup(() => useCacheStorage());
    result.reSync();
    unmount();
    vi.advanceTimersByTime(2100);
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});

describe("useCacheStorage — cleanup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("removes online and offline listeners on unmount", () => {
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    vi.stubGlobal("caches", makeMockCacheStorage({}));
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = withSetup(() => useCacheStorage());
    unmount();
    // VueUse's useOnline registers with an options object (passive) — match any third arg
    expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function), expect.anything());
    expect(removeSpy).toHaveBeenCalledWith("offline", expect.any(Function), expect.anything());
  });
});

describe("useCacheStorage — clearBucket error toast", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows error toast when caches.delete() throws in clearBucket", async () => {
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue([]),
      open: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockRejectedValue(new DOMException("SecurityError")),
      has: vi.fn(),
      match: vi.fn(),
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.clearBucket("api-search-index");
    expect(createToastNotify).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Suchindex"), status: "error" }),
    );
    unmount();
  });
});

describe("useCacheStorage — clearAll error toasts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows toast with failCount when some deletes are rejected in clearAll", async () => {
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue(["bucket-a", "bucket-b"]),
      open: vi.fn().mockResolvedValue(null),
      delete: vi.fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error("permission denied")),
      has: vi.fn(),
      match: vi.fn(),
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.clearAll();
    expect(createToastNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "1 Cache(s) konnten nicht geleert werden.",
        status: "error",
      }),
    );
    unmount();
  });

  it("shows generic error toast when caches.keys() throws in clearAll", async () => {
    vi.stubGlobal("caches", {
      keys: vi.fn().mockRejectedValue(new Error("Security error")),
      open: vi.fn().mockResolvedValue(null),
      delete: vi.fn(),
      has: vi.fn(),
      match: vi.fn(),
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.clearAll();
    expect(createToastNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Caches konnten nicht geleert werden.",
        status: "error",
      }),
    );
    unmount();
  });
});

describe("useCacheStorage — blob() non-TypeError error branch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("logs console.warn when blob() throws a non-TypeError", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const nonTypeError = new Error("quota exceeded");
    const mockResponse = {
      clone: () => ({ blob: () => Promise.reject(nonTypeError) }),
      headers: { get: (key: string) => (key === "Content-Type" ? "application/json" : null) },
    };
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue(["test-bucket"]),
      open: vi.fn().mockResolvedValue({
        keys: vi.fn().mockResolvedValue([new Request("https://example.com/data.json")]),
        match: vi.fn().mockResolvedValue(mockResponse),
        delete: vi.fn(),
      }),
      delete: vi.fn(),
      has: vi.fn(),
      match: vi.fn(),
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[useCacheStorage] Unexpected blob() error for",
      "https://example.com/data.json",
      nonTypeError,
    );
    unmount();
  });
});

describe("useCacheStorage — rejected bucket in Promise.allSettled", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("logs console.error when a bucket load rejects inside allSettled", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const loadError = new Error("Permission denied");
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue(["good-bucket", "bad-bucket"]),
      open: vi.fn().mockImplementation((name: string) => {
        if (name === "bad-bucket") return Promise.reject(loadError);
        return Promise.resolve({
          keys: vi.fn().mockResolvedValue([]),
          match: vi.fn(),
          delete: vi.fn(),
        });
      }),
      delete: vi.fn(),
      has: vi.fn(),
      match: vi.fn(),
    });
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.loadCaches();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[useCacheStorage] Failed to load cache bucket:",
      loadError,
    );
    unmount();
  });
});
