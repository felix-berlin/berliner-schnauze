import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchRedirects } = vi.hoisted(() => ({ fetchRedirects: vi.fn() }));
vi.mock("@services/payload/redirects.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@services/payload/redirects.ts")>()),
  fetchRedirects,
}));

import { onRequest } from "../../../middleware/index.ts";

const run = (next: () => Promise<Response>, path = "/") =>
  (onRequest as (ctx: unknown, next: () => Promise<Response>) => Promise<Response>)(
    { url: new URL(path, "https://berliner-schnauze.wtf") },
    next,
  );
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

  it("keeps a 404 without a redirect", async () => {
    const res = await run(notFound, "/wort/unbekannt");
    expect(res.status).toBe(404);
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
});
