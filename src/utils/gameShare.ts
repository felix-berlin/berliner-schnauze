export interface SharePayload {
  score: number
  bestStreak: number
  totalAnswered: number
  correctAnswers: number
  date: string
}

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str: string): string {
  const padded = str
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(str.length + (4 - (str.length % 4)) % 4, '=')
  return atob(padded)
}

export function encodeShareHash(payload: SharePayload): string {
  const uuid = crypto.randomUUID()
  const b64 = toBase64Url(JSON.stringify(payload))
  return `${uuid}.${b64}`
}

export function decodeShareHash(hash: string): SharePayload | null {
  const dotIndex = hash.indexOf('.')
  if (dotIndex === -1) return null
  const b64 = hash.slice(dotIndex + 1)
  if (!b64) return null
  try {
    return JSON.parse(fromBase64Url(b64)) as SharePayload
  } catch {
    return null
  }
}

export function buildShareUrl(payload: SharePayload): string {
  return `/games/berliner-oder-nicht/share#${encodeShareHash(payload)}`
}
