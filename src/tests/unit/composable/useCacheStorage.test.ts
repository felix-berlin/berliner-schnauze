import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp } from 'vue'
import { formatBytes, getBucketDisplayName } from '@composables/useCacheStorage'
import { useCacheStorage } from '@composables/useCacheStorage'

// Helper: mounts a composable inside a Vue app (needed for onMounted/onUnmounted)
function withSetup<T>(composable: () => T): { result: T; unmount: () => void } {
  let result!: T
  const app = createApp({
    setup() {
      result = composable()
      return () => null
    },
  })
  const el = document.createElement('div')
  app.mount(el)
  return { result, unmount: () => app.unmount() }
}

// Helper: builds a mock CacheStorage
function makeMockCacheStorage(
  data: Record<string, Array<{ url: string; dateStr?: string; size?: number }>>,
) {
  const cacheInstances = Object.fromEntries(
    Object.entries(data).map(([name, entries]) => {
      const requests = entries.map((e) => new Request(e.url))
      const responseMap = new Map(
        entries.map((e) => [
          e.url,
          new Response(new Uint8Array(e.size ?? 100), {
            headers: e.dateStr ? { Date: e.dateStr } : {},
          }),
        ]),
      )
      return [
        name,
        {
          keys: vi.fn().mockResolvedValue(requests),
          match: vi.fn().mockImplementation((req: Request) =>
            Promise.resolve(responseMap.get(req.url) ?? null),
          ),
          delete: vi.fn().mockResolvedValue(true),
        },
      ]
    }),
  )

  return {
    keys: vi.fn().mockResolvedValue(Object.keys(data)),
    open: vi.fn().mockImplementation((name: string) =>
      Promise.resolve(cacheInstances[name]),
    ),
    delete: vi.fn().mockImplementation((name: string) => {
      delete cacheInstances[name]
      return Promise.resolve(true)
    }),
    has: vi.fn(),
    match: vi.fn(),
  }
}

describe('formatBytes', () => {
  it('returns "0 B" for 0', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('returns bytes for values under 1 KB', () => {
    expect(formatBytes(500)).toBe('500 B')
  })

  it('formats KB range', () => {
    expect(formatBytes(2048)).toBe('2,0 KB')
  })

  it('formats MB range', () => {
    expect(formatBytes(1_048_576)).toBe('1,0 MB')
  })

  it('formats fractional MB', () => {
    expect(formatBytes(3_250_000)).toBe('3,1 MB')
  })
})

describe('getBucketDisplayName', () => {
  it('maps api-search-index', () => {
    expect(getBucketDisplayName('api-search-index')).toBe('Suchindex')
  })

  it('maps api-search-meta', () => {
    expect(getBucketDisplayName('api-search-meta')).toBe('Such-Metadaten')
  })

  it('maps api-word-of-the-day', () => {
    expect(getBucketDisplayName('api-word-of-the-day')).toBe('Wort des Tages')
  })

  it('maps workbox-precache with versioned suffix', () => {
    expect(getBucketDisplayName('workbox-precache-v2-https://example.com/')).toBe('App-Dateien')
  })

  it('returns raw name for unknown cache', () => {
    expect(getBucketDisplayName('my-custom-cache')).toBe('my-custom-cache')
  })
})

describe('useCacheStorage — loadCaches', () => {
  let mockCacheStorage: ReturnType<typeof makeMockCacheStorage>

  beforeEach(() => {
    mockCacheStorage = makeMockCacheStorage({
      'api-search-index': [
        { url: 'https://example.com/api/search/index.json', size: 1024, dateStr: 'Thu, 01 Jan 2026 10:00:00 GMT' },
      ],
      'api-word-of-the-day': [
        { url: 'https://example.com/api/word-of-the-day', size: 512 },
      ],
    })
    vi.stubGlobal('caches', mockCacheStorage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('populates buckets with correct names', async () => {
    const { result, unmount } = withSetup(() => useCacheStorage())
    await result.loadCaches()
    expect(result.buckets.value.map((b) => b.name)).toEqual([
      'api-search-index',
      'api-word-of-the-day',
    ])
    unmount()
  })

  it('counts entries per bucket', async () => {
    const { result, unmount } = withSetup(() => useCacheStorage())
    await result.loadCaches()
    const idx = result.buckets.value.find((b) => b.name === 'api-search-index')!
    expect(idx.entryCount).toBe(1)
    unmount()
  })

  it('sums total size in bytes', async () => {
    const { result, unmount } = withSetup(() => useCacheStorage())
    await result.loadCaches()
    const idx = result.buckets.value.find((b) => b.name === 'api-search-index')!
    expect(idx.totalSizeBytes).toBe(1024)
    unmount()
  })

  it('reads lastModified from Date header', async () => {
    const { result, unmount } = withSetup(() => useCacheStorage())
    await result.loadCaches()
    const idx = result.buckets.value.find((b) => b.name === 'api-search-index')!
    expect(idx.lastModified).toBeInstanceOf(Date)
    expect(idx.lastModified?.toISOString()).toBe('2026-01-01T10:00:00.000Z')
    unmount()
  })

  it('sets lastModified to null when no Date header', async () => {
    const { result, unmount } = withSetup(() => useCacheStorage())
    await result.loadCaches()
    const wotd = result.buckets.value.find((b) => b.name === 'api-word-of-the-day')!
    expect(wotd.lastModified).toBeNull()
    unmount()
  })

  it('computes correct totalSizeBytes across all buckets', async () => {
    const { result, unmount } = withSetup(() => useCacheStorage())
    await result.loadCaches()
    expect(result.totalSizeBytes.value).toBe(1024 + 512)
    unmount()
  })

  it('sets isLoading false after completion', async () => {
    const { result, unmount } = withSetup(() => useCacheStorage())
    const promise = result.loadCaches()
    expect(result.isLoading.value).toBe(true)
    await promise
    expect(result.isLoading.value).toBe(false)
    unmount()
  })

  it('returns empty buckets when caches API unavailable', async () => {
    vi.stubGlobal('caches', undefined)
    const { result, unmount } = withSetup(() => useCacheStorage())
    await result.loadCaches()
    expect(result.buckets.value).toEqual([])
    unmount()
  })
})

describe('useCacheStorage — clearBucket', () => {
  let mockCacheStorage: ReturnType<typeof makeMockCacheStorage>

  beforeEach(() => {
    mockCacheStorage = makeMockCacheStorage({
      'api-search-index': [{ url: 'https://example.com/api/search/index.json', size: 100 }],
      'api-word-of-the-day': [{ url: 'https://example.com/api/wotd', size: 50 }],
    })
    vi.stubGlobal('caches', mockCacheStorage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls caches.delete with the bucket name', async () => {
    const { result, unmount } = withSetup(() => useCacheStorage())
    await result.clearBucket('api-search-index')
    expect(mockCacheStorage.delete).toHaveBeenCalledWith('api-search-index')
    unmount()
  })

  it('reloads buckets after clearing', async () => {
    const { result, unmount } = withSetup(() => useCacheStorage())
    await result.clearBucket('api-search-index')
    // caches.keys() was called again (second call = after clear)
    expect(mockCacheStorage.keys).toHaveBeenCalledTimes(2)
    unmount()
  })
})

describe('useCacheStorage — clearAll', () => {
  let mockCacheStorage: ReturnType<typeof makeMockCacheStorage>

  beforeEach(() => {
    mockCacheStorage = makeMockCacheStorage({
      'api-search-index': [{ url: 'https://example.com/a', size: 100 }],
      'workbox-precache-v2': [{ url: 'https://example.com/b', size: 200 }],
    })
    vi.stubGlobal('caches', mockCacheStorage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('deletes all cache buckets', async () => {
    const { result, unmount } = withSetup(() => useCacheStorage())
    await result.clearAll()
    expect(mockCacheStorage.delete).toHaveBeenCalledWith('api-search-index')
    expect(mockCacheStorage.delete).toHaveBeenCalledWith('workbox-precache-v2')
    unmount()
  })

  it('reloads after clearing all', async () => {
    const { result, unmount } = withSetup(() => useCacheStorage())
    await result.clearAll()
    expect(mockCacheStorage.keys).toHaveBeenCalledTimes(2)
    unmount()
  })
})

describe('useCacheStorage — onlineStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is "online" initially when navigator.onLine is true', () => {
    vi.stubGlobal('navigator', { onLine: true, serviceWorker: null })
    const { result, unmount } = withSetup(() => useCacheStorage())
    expect(result.onlineStatus.value).toBe('online')
    unmount()
  })

  it('updates to "offline" on offline event', async () => {
    vi.stubGlobal('navigator', { onLine: true, serviceWorker: null })
    vi.stubGlobal('caches', makeMockCacheStorage({}))
    const { result, unmount } = withSetup(() => useCacheStorage())
    window.dispatchEvent(new Event('offline'))
    expect(result.onlineStatus.value).toBe('offline')
    unmount()
  })

  it('updates to "online" on online event', async () => {
    vi.stubGlobal('navigator', { onLine: false, serviceWorker: null })
    vi.stubGlobal('caches', makeMockCacheStorage({}))
    const { result, unmount } = withSetup(() => useCacheStorage())
    window.dispatchEvent(new Event('offline'))
    window.dispatchEvent(new Event('online'))
    expect(result.onlineStatus.value).toBe('online')
    unmount()
  })
})
