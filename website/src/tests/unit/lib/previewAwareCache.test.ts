import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearAllMemos: vi.fn(),
  invalidate: vi.fn(async (_options: unknown) => {}),
  poll: vi.fn(),
  pollerOptions: undefined as undefined | { onChange: () => Promise<void> | void },
}));

const inner = vi.fn(
  async (_context?: unknown, _next?: () => Promise<Response>) => new Response("from cache"),
);
vi.mock("astro/cache/memory", () => ({
  default: () => ({ invalidate: mocks.invalidate, name: "memory", onRequest: inner }),
}));
vi.mock("@services/cacheStamp.ts", () => ({
  createStampPoller: (options: { onChange: () => Promise<void> | void }) => {
    mocks.pollerOptions = options;
    return mocks.poll;
  },
  readStamp: vi.fn(),
}));
vi.mock("@services/cache.ts", () => ({ clearAllMemos: mocks.clearAllMemos }));

import factory from "@lib/previewAwareCache.ts";

const context = (cookie?: string, path = "/wort/aalen") =>
  ({
    logger: { error() {}, info() {}, warn() {} },
    request: new Request(`https://example.test${path}`, {
      headers: cookie ? { cookie } : {},
    }),
    url: new URL(`https://example.test${path}`),
  }) as never;

describe("previewAwareCache", () => {
  const provider = factory({});
  const next = async () => new Response("rendered");

  it("hands a request without a preview cookie to the memory cache", async () => {
    inner.mockClear();
    expect(await (await provider.onRequest!(context("a=1"), next)).text()).toBe("from cache");
    expect(inner).toHaveBeenCalledOnce();
  });

  it("renders a request with a preview cookie and never asks the cache", async () => {
    inner.mockClear();
    const response = await provider.onRequest!(context("a=1; bs_preview=token"), next);
    expect(await response.text()).toBe("rendered");
    expect(inner).not.toHaveBeenCalled();
  });

  it("renders the start page with ?q= (old share link redirect) but caches / and other ?q= paths", async () => {
    inner.mockClear();
    expect(await (await provider.onRequest!(context(undefined, "/?q=foo"), next)).text()).toBe(
      "rendered",
    );
    expect(inner).not.toHaveBeenCalled();
    await provider.onRequest!(context(undefined, "/"), next);
    await provider.onRequest!(context(undefined, "/suche?q=foo"), next);
    expect(inner).toHaveBeenCalledTimes(2);
  });

  it("polls the stamp for a request with a preview cookie", async () => {
    mocks.poll.mockClear();
    await provider.onRequest!(context("bs_preview=token"), next);
    expect(mocks.poll).toHaveBeenCalledOnce();
  });

  it("polls the stamp for the /?q= path too", async () => {
    mocks.poll.mockClear();
    await provider.onRequest!(context(undefined, "/?q=foo"), next);
    expect(mocks.poll).toHaveBeenCalledOnce();
  });

  it("clears the memos and invalidates the site tag when the stamp changes", async () => {
    mocks.clearAllMemos.mockClear();
    mocks.invalidate.mockClear();
    await mocks.pollerOptions!.onChange();
    expect(mocks.clearAllMemos).toHaveBeenCalledOnce();
    expect(mocks.invalidate).toHaveBeenCalledWith({ tags: "site" });
  });

  it("hands the memory cache a render whose response carries the Cache-Tag site", async () => {
    inner.mockImplementationOnce(async (_context, render) => render!());
    const response = await provider.onRequest!(context(), async () => new Response("page"));
    expect(response.headers.get("Cache-Tag")).toBe("site");
  });

  it("keeps the tags a page set and adds site", async () => {
    inner.mockImplementationOnce(async (_context, render) => render!());
    const response = await provider.onRequest!(
      context(),
      async () => new Response("page", { headers: { "Cache-Tag": "words" } }),
    );
    expect(response.headers.get("Cache-Tag")).toBe("words, site");
  });

  it("tags a response whose headers are immutable too", async () => {
    inner.mockImplementationOnce(async (_context, render) => render!());
    const response = await provider.onRequest!(context(), async () =>
      Response.redirect("https://example.test/x", 302),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Cache-Tag")).toBe("site");
  });
});
