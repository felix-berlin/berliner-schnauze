import { describe, expect, it } from 'vitest'
import { buildShareUrl, decodeShareHash, encodeShareHash } from '@utils/gameShare'
import type { SharePayload } from '@utils/gameShare'

const payload: SharePayload = {
  score: 150,
  bestStreak: 7,
  totalAnswered: 18,
  correctAnswers: 14,
  date: '2026-06-11T00:00:00.000Z',
}

describe('encodeShareHash', () => {
  it('returns a non-empty string', () => {
    expect(encodeShareHash(payload)).toBeTruthy()
  })

  it('contains a UUID prefix (8-4-4-4-12 hex)', () => {
    const hash = encodeShareHash(payload)
    const [uuid] = hash.split('.')
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it('two calls produce different UUIDs', () => {
    expect(encodeShareHash(payload)).not.toBe(encodeShareHash(payload))
  })
})

describe('decodeShareHash', () => {
  it('round-trips payload', () => {
    const hash = encodeShareHash(payload)
    expect(decodeShareHash(hash)).toEqual(payload)
  })

  it('returns null for empty string', () => {
    expect(decodeShareHash('')).toBeNull()
  })

  it('returns null for garbage input', () => {
    expect(decodeShareHash('notvalid')).toBeNull()
  })

  it('returns null for base64 that decodes to non-JSON', () => {
    expect(decodeShareHash('uuid.bm90anNvbg==')).toBeNull()
  })
})

describe('buildShareUrl', () => {
  it('returns a path with the correct route and a decodable hash', () => {
    const url = buildShareUrl(payload)
    expect(url.startsWith('/games/berliner-oder-nicht/share#')).toBe(true)
    const hash = url.split('#')[1]
    expect(decodeShareHash(hash)).toEqual(payload)
  })
})
