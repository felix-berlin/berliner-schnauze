// Client copy of the code format in payload/src/lib/bonPlayer.ts (that module imports node:crypto). It also strips underscores
// (SPEC §12), the server does not; it only ever gets the normalized code and normalizes again.
// No I, L, O, 0, 1: look-alikes are left out. 31 characters.
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{12}$`);

/** Canonical `XXXX-XXXX-XXXX` or undefined; any case, whitespace, dashes and underscores are ignored. */
export function normalizeCode(input: string): string | undefined {
  const raw = input.toUpperCase().replace(/[\s_-]/g, "");
  return CODE_PATTERN.test(raw) ? raw.replace(/(.{4})(?=.)/g, "$1-") : undefined;
}
