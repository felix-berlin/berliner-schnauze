// Pure BON player code format, shared with the website (payload-app/bon-player): no payload/next imports.
import { randomBytes } from "node:crypto";

// No I, L, O, 0, 1: look-alikes are left out. 31 characters.
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const CODE_LENGTH = 12;
// Largest multiple of 31 below 256; bytes at or above it are discarded so every character is uniform.
const LIMIT = 248;

export function generateCode(): string {
  let chars = "";
  while (chars.length < CODE_LENGTH) {
    for (const byte of randomBytes(CODE_LENGTH * 2)) {
      if (byte >= LIMIT) continue;
      chars += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      if (chars.length === CODE_LENGTH) break;
    }
  }
  return chars.replace(/(.{4})(?=.)/g, "$1-");
}

/** Canonical `XXXX-XXXX-XXXX` or undefined; accepts any case, whitespace and dashes (not underscores, unlike the client copy); at most 64 characters. */
export function normalizeCode(input: string): string | undefined {
  if (input.length > 64) return undefined;
  const raw = input.toUpperCase().replace(/[\s-]/g, "");
  if (!new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(raw)) return undefined;
  return raw.replace(/(.{4})(?=.)/g, "$1-");
}
