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
