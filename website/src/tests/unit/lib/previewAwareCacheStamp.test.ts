import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ calls: [] as string[], stamp: "a" as string | null }));

vi.mock("astro/cache/memory", () => ({
  default: () => ({
    invalidate: async (options: unknown) => {
      state.calls.push(`invalidate ${JSON.stringify(options)}`);
    },
    name: "memory",
    onRequest: async (_context: unknown, next: () => Promise<Response>) => {
      state.calls.push("serve");
      return next();
    },
  }),
}));
vi.mock("@services/cacheStamp.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@services/cacheStamp.ts")>()),
  readStamp: async () => state.stamp,
}));

import factory from "@lib/previewAwareCache.ts";
import { ttl } from "@services/cache.ts";

const context = () =>
  ({
    request: new Request("https://example.test/wort/aalen"),
    url: new URL("https://example.test/wort/aalen"),
  }) as never;

beforeEach(() => {
  vi.useFakeTimers();
  state.calls = [];
  state.stamp = "a";
});
afterEach(() => vi.useRealTimers());

describe("page cache provider with the real stamp poller", () => {
  it("empties the page cache and the memos before serving the first request after a stamp change", async () => {
    const load = vi.fn().mockResolvedValueOnce("old").mockResolvedValueOnce("new");
    const memo = ttl(60_000, load);
    const provider = factory({});
    const next = async () => new Response("page");

    await provider.onRequest!(context(), next); // first read only remembers the stamp
    expect(await memo()).toBe("old");
    expect(state.calls).toEqual(["serve"]);

    state.stamp = "b";
    vi.advanceTimersByTime(2000);
    state.calls = [];
    await provider.onRequest!(context(), next);

    expect(state.calls).toEqual(['invalidate {"tags":"site"}', "serve"]);
    expect(await memo()).toBe("new");
  });

  it("leaves no timer behind when the check is quick", async () => {
    const provider = factory({});
    await provider.onRequest!(context(), async () => new Response("page"));
    expect(vi.getTimerCount()).toBe(0);
  });
});
