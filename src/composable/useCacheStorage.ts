import { createToastNotify } from '@stores/index'

export interface CacheBucket {
  name: string
  entryCount: number
  totalSizeBytes: number
  lastModified: Date | null
  urls: string[]
}

const BUCKET_NAME_MAP: Record<string, string> = {
  'api-search-index': 'Suchindex',
  'api-search-meta': 'Such-Metadaten',
  'api-word-of-the-day': 'Wort des Tages',
  'workbox-precache': 'App-Dateien',
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export function getBucketDisplayName(name: string): string {
  for (const [prefix, displayName] of Object.entries(BUCKET_NAME_MAP)) {
    if (name.startsWith(prefix)) return displayName
  }
  return name
}

import { computed, onMounted, onUnmounted, ref } from 'vue'

export function useCacheStorage() {
  const buckets = ref<CacheBucket[]>([])
  const isLoading = ref(false)
  const isCacheAvailable = computed(
    () => typeof window !== 'undefined' && 'caches' in window,
  )
  const totalSizeBytes = computed(() =>
    buckets.value.reduce((sum, b) => sum + b.totalSizeBytes, 0),
  )

  async function loadCaches(): Promise<void> {
    if (typeof caches === 'undefined' || !caches) return
    isLoading.value = true
    try {
      const cacheNames = await caches.keys()
      const results = await Promise.all(
        cacheNames.map(async (name): Promise<CacheBucket> => {
          const cache = await caches.open(name)
          if (!cache) return { name, entryCount: 0, totalSizeBytes: 0, lastModified: null, urls: [] }
          const requests = await cache.keys()
          const urls = requests.map((req) => req.url)

          let totalSizeBytes = 0
          let lastModified: Date | null = null

          for (const request of requests) {
            const response = await cache.match(request)
            if (!response) continue

            try {
              const blob = await response.clone().blob()
              totalSizeBytes += blob.size
            } catch {
              // opaque/CORS response — skip size
            }

            if (!lastModified) {
              const dateHeader = response.headers.get('Date')
              if (dateHeader) lastModified = new Date(dateHeader)
            }
          }

          return { name, entryCount: requests.length, totalSizeBytes, lastModified, urls }
        }),
      )
      buckets.value = results
    } finally {
      isLoading.value = false
    }
  }

  const onlineStatus = ref<'online' | 'offline'>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
  )

  onMounted(() => {
    const handleOnline = () => {
      onlineStatus.value = 'online'
    }
    const handleOffline = () => {
      onlineStatus.value = 'offline'
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    onUnmounted(() => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    })
  })

  async function clearBucket(name: string): Promise<void> {
    if (typeof caches === 'undefined' || !caches) return
    await caches.delete(name)
    await loadCaches()
  }

  async function clearAll(): Promise<void> {
    if (typeof caches === 'undefined' || !caches) return
    const names = await caches.keys()
    await Promise.all(names.map((name) => caches.delete(name)))
    await loadCaches()
  }

  function reSync(): void {
    createToastNotify({
      message: 'Cache wird aktualisiert…',
      status: 'info',
      showClose: false,
      timeout: 2000,
    })
    setTimeout(() => location.reload(), 800)
  }

  return {
    buckets,
    isLoading,
    isCacheAvailable,
    totalSizeBytes,
    onlineStatus,
    loadCaches,
    clearBucket,
    clearAll,
    reSync,
  }
}
