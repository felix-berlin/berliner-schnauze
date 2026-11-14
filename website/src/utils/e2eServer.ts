import { E2E_SERVER, PAYLOAD_SERVER_URL } from "astro:env/server";

/**
 * The Playwright e2e server (started with E2E_SERVER=1) runs deterministic: no live Wakapi call, no rate limits.
 * Honoured only while PAYLOAD_SERVER_URL is a localhost URL (CI and the local e2e recipe), so the flag on a
 * production container, whose media URLs must be public, does nothing.
 */
export const isE2eServer = (flag = E2E_SERVER, serverUrl = PAYLOAD_SERVER_URL): boolean =>
  flag === "1" && /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/.test(serverUrl ?? "");
