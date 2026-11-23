import { describe, expect, it, vi } from "vitest";

const inner = vi.fn(async () => new Response("from cache"));
vi.mock("astro/cache/memory", () => ({
  default: () => ({ invalidate: async () => {}, name: "memory", onRequest: inner }),
}));

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
});
