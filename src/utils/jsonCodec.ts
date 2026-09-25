/**
 * Encode/decode pair for `@nanostores/persistent` stores holding JSON values.
 * Falls back to the raw string when a stored value is not valid JSON.
 */
export const jsonCodec = {
  decode(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },
  encode: (value: unknown) => JSON.stringify(value),
};
