import { describe, expect, it } from 'vitest'
import { buildShareUrl, decodeShareHash, encodeShareHash } from '@utils/bonShare'
import type { BonSharePayload } from '@utils/bonShare'

const payload: BonSharePayload = {
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

describe('decodeShareHash — edge cases', () => {
  it('returns null when hash has no dot', () => {
    expect(decodeShareHash('nodothere')).toBeNull()
  })

  it('returns null when b64 part is empty (trailing dot)', () => {
    expect(decodeShareHash('some-uuid.')).toBeNull()
  })

  it('returns null for base64 that decodes to non-JSON', () => {
    expect(decodeShareHash('uuid.bm90anNvbg')).toBeNull()
  })
})

describe('buildShareUrl', () => {
  it('returns a path with the correct route and a decodable r param', () => {
    const url = buildShareUrl(payload)
    expect(url.startsWith('/games/berliner-oder-nicht/share?r=')).toBe(true)
    const r = new URLSearchParams(url.split('?')[1]).get('r')!
    expect(decodeShareHash(r)).toEqual(payload)
  })
})

describe('decodeShareHash — invalid payload validation', () => {
  function encodeRaw(value: unknown): string {
    const b64 = btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    return `uuid.${b64}`
  }

  it('returns null when decoded JSON is null (covers isValidPayload null check)', () => {
    expect(decodeShareHash(encodeRaw(null))).toBeNull()
  })

  it('returns null when decoded JSON is a primitive (non-object)', () => {
    expect(decodeShareHash(encodeRaw(42))).toBeNull()
  })

  it('returns null when score is negative (covers isFiniteNonNegative false branch)', () => {
    expect(decodeShareHash(encodeRaw({ ...payload, score: -1 }))).toBeNull()
  })

  it('returns null when score is not a number', () => {
    expect(decodeShareHash(encodeRaw({ ...payload, score: 'not-a-number' }))).toBeNull()
  })

  it('returns null when date is missing', () => {
    const { date: _d, ...noDate } = payload
    expect(decodeShareHash(encodeRaw(noDate))).toBeNull()
  })

  it('returns null when playerName is a non-string value', () => {
    expect(decodeShareHash(encodeRaw({ ...payload, playerName: 123 }))).toBeNull()
  })

  it('accepts valid payload with optional playerName as string', () => {
    expect(decodeShareHash(encodeRaw({ ...payload, playerName: 'Alice' }))).toMatchObject({
      playerName: 'Alice',
    })
  })
})
