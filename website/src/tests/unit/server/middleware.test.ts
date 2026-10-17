import { describe, expect, it, vi } from "vitest";

import { onRequest } from "../../../middleware/index.ts";

const run = (next: () => Promise<Response>) =>
  (onRequest as (ctx: unknown, next: () => Promise<Response>) => Promise<Response>)({}, next);

describe("middleware", () => {
  it("passes a successful response through", async () => {
    const res = await run(async () => new Response("ok"));
    expect(await res.text()).toBe("ok");
  });

  it("answers 503 without caching when rendering throws (e.g. the database is down)", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await run(async () => {
      throw new Error("db down");
    });
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Retry-After")).toBe("30");
    error.mockRestore();
  });
});
