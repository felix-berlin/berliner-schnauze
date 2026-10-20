import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchRedirects } = vi.hoisted(() => ({ fetchRedirects: vi.fn() }));
vi.mock("@services/payload/redirects.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@services/payload/redirects.ts")>()),
  fetchRedirects,
}));

import { onRequest } from "../../../middleware/index.ts";

const run = (next: () => Promise<Response>, path = "/", init: RequestInit = {}) => {
  const url = new URL(path, "https://berliner-schnauze.wtf");
  return (onRequest as (ctx: unknown, next: () => Promise<Response>) => Promise<Response>)(
    { clientAddress: "10.0.0.1", request: new Request(url, init), url },
    next,
  );
};
const notFound = async () => new Response("weg", { status: 404 });

beforeEach(() => {
  fetchRedirects
    .mockReset()
    .mockResolvedValue(new Map([["/wort/alt", { location: "/wort/neu", status: 301 }]]));
});

describe("middleware", () => {
  it("passes a successful response through without looking up redirects", async () => {
    const res = await run(async () => new Response("ok"), "/wort/alt");
    expect(await res.text()).toBe("ok");
    expect(fetchRedirects).not.toHaveBeenCalled();
  });

  it("answers a 404 that has a redirect with it, trailing slash ignored", async () => {
    const res = await run(notFound, "/wort/alt/");
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("/wort/neu");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage");
  });

  it("keeps the 404 instead of redirecting a path to itself (no loop)", async () => {
    fetchRedirects.mockResolvedValue(
      new Map([["/wort/kreis", { location: "/wort/kreis/", status: 301 }]]),
    );
    const res = await run(notFound, "/wort/kreis");
    expect(res.status).toBe(404);
  });

  it("keeps a 404 without a redirect, never cached", async () => {
    const res = await run(notFound, "/wort/unbekannt");
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("gives every response the page cache policy, unless the route set its own", async () => {
    expect((await run(async () => new Response("ok"))).headers.get("Cache-Control")).toContain(
      "s-maxage=300",
    );
    const own = await run(
      async () => new Response("ok", { headers: { "Cache-Control": "private, no-store" } }),
    );
    expect(own.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("keeps the 404 when the redirect lookup fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchRedirects.mockRejectedValue(new Error("db down"));
    const res = await run(notFound, "/wort/alt");
    expect(res.status).toBe(404);
    error.mockRestore();
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

  it("answers 429 once a client is over the limit of an expensive route, before rendering", async () => {
    const page = vi.fn(async () => new Response("png"));
    const headers = { "x-forwarded-for": "6.6.6.6, 203.0.113.9" };
    for (let i = 0; i < 60; i++)
      expect((await run(page, "/og/a.png", { headers })).status).toBe(200);
    const res = await run(page, "/og/a.png", { headers });
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(page).toHaveBeenCalledTimes(60);
    // Keyed on the entry the proxy appended, not the client-supplied first one.
    const other = { "x-forwarded-for": "6.6.6.6, 203.0.113.10" };
    expect((await run(page, "/og/a.png", { headers: other })).status).toBe(200);
  });
});
