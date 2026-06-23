export interface BonSharePayload {
  score: number
  bestStreak: number
  totalAnswered: number
  correctAnswers: number
  date: string
  playerName?: string
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

export function encodeShareHash(payload: BonSharePayload): string {
  const uuid = crypto.randomUUID()
  const b64 = toBase64Url(JSON.stringify(payload))
  return `${uuid}.${b64}`
}

// Share URLs are user-manipulable — validate the decoded shape instead of
// blindly trusting the cast, so garbage values never reach the share view.
function isValidPayload(value: unknown): value is BonSharePayload {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  const isFiniteNonNegative = (n: unknown): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0
  return (
    isFiniteNonNegative(p.score) &&
    isFiniteNonNegative(p.bestStreak) &&
    isFiniteNonNegative(p.totalAnswered) &&
    isFiniteNonNegative(p.correctAnswers) &&
    typeof p.date === 'string' &&
    (p.playerName === undefined || typeof p.playerName === 'string')
  )
}

export function decodeShareHash(hash: string): BonSharePayload | null {
  const dotIndex = hash.indexOf('.')
  if (dotIndex === -1) return null
  const b64 = hash.slice(dotIndex + 1)
  if (!b64) return null
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(b64))
    return isValidPayload(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function buildShareUrl(payload: BonSharePayload): string {
  return `/games/berliner-oder-nicht/share?r=${encodeShareHash(payload)}`
}
