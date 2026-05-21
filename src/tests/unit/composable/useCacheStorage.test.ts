import { describe, it, expect } from 'vitest'
import { formatBytes, getBucketDisplayName } from '@composables/useCacheStorage'

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
