import { describe, expect, it, vi } from "vitest";

const inner = vi.fn(async () => new Response("from cache"));
vi.mock("astro/cache/memory", () => ({
  default: () => ({ invalidate: async () => {}, name: "memory", onRequest: inner }),
}));

import factory from "@lib/previewAwareCache.ts";

const context = (cookie?: string) =>
  ({
    logger: { error() {}, info() {}, warn() {} },
    request: new Request("https://example.test/wort/aalen", {
      headers: cookie ? { cookie } : {},
    }),
    url: new URL("https://example.test/wort/aalen"),
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
});
