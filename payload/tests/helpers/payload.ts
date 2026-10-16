import type { Payload } from "payload";
import { getPayload } from "payload";

let cached: Promise<Payload> | undefined;

/** Payload bound to DATABASE_URL_TEST (schema pushed). Throws when unset, never skips. */
export function getTestPayload(): Promise<Payload> {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is not set; refusing to run tests without a test database");
  cached ??= (async () => {
    process.env.DATABASE_URL = url;
    process.env.PAYLOAD_SECRET ||= "test-secret";
    const { default: config } = await import("../../src/payload.config");
    return getPayload({ config });
  })();
  return cached;
}
