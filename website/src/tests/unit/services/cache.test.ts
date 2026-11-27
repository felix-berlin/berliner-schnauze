import { clearAllMemos, ttl, ttlBy } from "@services/cache.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const flush = () => vi.advanceTimersByTimeAsync(0);

describe("ttl", () => {
  it("returns the memoized value within the window", async () => {
    const load = vi.fn().mockResolvedValue("a");
    const get = ttl(1000, load);
    expect(await get()).toBe("a");
    vi.advanceTimersByTime(999);
    expect(await get()).toBe("a");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("serves the stale value after the window while one refresh runs in the background", async () => {
    let finish!: (value: string) => void;
    const load = vi
      .fn()
      .mockResolvedValueOnce("a")
      .mockReturnValueOnce(new Promise<string>((resolve) => (finish = resolve)));
    const get = ttl(1000, load);
    expect(await get()).toBe("a");
    vi.advanceTimersByTime(1001);
    expect(await get()).toBe("a");
    expect(await get()).toBe("a");
    expect(load).toHaveBeenCalledTimes(2); // one refresh, not one per caller
    finish("b");
    await flush();
    expect(await get()).toBe("b");
  });

  it("keeps serving the stale value when a refresh fails, and retries on the next call", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const load = vi
      .fn()
      .mockResolvedValueOnce("a")
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce("c");
    const get = ttl(1000, load);
    await get();
    vi.advanceTimersByTime(1001);
    expect(await get()).toBe("a");
    await flush();
    expect(await get()).toBe("a"); // stale, and this call starts the retry
    await flush();
    expect(await get()).toBe("c");
    error.mockRestore();
  });

  it("shares one in-flight load between concurrent callers", async () => {
    const load = vi.fn().mockResolvedValue("a");
    const get = ttl(1000, load);
    await Promise.all([get(), get()]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache a first load that fails", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("db down")).mockResolvedValueOnce("ok");
    const get = ttl(1000, load);
    await expect(get()).rejects.toThrow("db down");
    expect(await get()).toBe("ok");
  });
});

describe("clearAllMemos", () => {
  it("makes the next ttl call reload", async () => {
    const load = vi.fn().mockResolvedValueOnce("a").mockResolvedValueOnce("b");
    const get = ttl(1000, load);
    expect(await get()).toBe("a");
    expect(await get()).toBe("a");
    clearAllMemos();
    expect(await get()).toBe("b");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("drops every ttlBy key", async () => {
    const load = vi.fn(async (key: string) => `${key}:${load.mock.calls.length}`);
    const get = ttlBy(1000, 10, load);
    await get("x");
    await get("y");
    clearAllMemos();
    expect(await get("x")).toBe("x:3");
    expect(await get("y")).toBe("y:4");
  });

  it("leaves a ttl marked external alone (it does not hold CMS data)", async () => {
    const load = vi.fn().mockResolvedValueOnce("a").mockResolvedValueOnce("b");
    const get = ttl(1000, load, { external: true });
    expect(await get()).toBe("a");
    clearAllMemos();
    expect(await get()).toBe("a");
    expect(load).toHaveBeenCalledOnce();
  });

  it("is not undone by a refresh that was already running", async () => {
    let finishOld!: (value: string) => void;
    const load = vi
      .fn()
      .mockResolvedValueOnce("a")
      .mockReturnValueOnce(new Promise<string>((resolve) => (finishOld = resolve)))
      .mockResolvedValueOnce("new");
    const get = ttl(1000, load);
    await get();
    vi.advanceTimersByTime(1001);
    await get(); // starts the background refresh
    clearAllMemos();
    finishOld("old");
    await flush();
    expect(await get()).toBe("new");
  });
});

describe("ttl with NO_TTL_CACHE=1", () => {
  const fresh = async () => {
    vi.resetModules();
    return (await import("@services/cache.ts")).ttl;
  };
  afterEach(() => vi.unstubAllEnvs());

  it("loads on every call", async () => {
    vi.stubEnv("NO_TTL_CACHE", "1");
    const load = vi.fn(async () => 1);
    const get = (await fresh())(60_000, load);
    await get();
    await get();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("warns once at load when it is set in production", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("NO_TTL_CACHE", "1");
    vi.stubEnv("NODE_ENV", "production");
    const ttlFresh = await fresh();
    ttlFresh(1, async () => 1);
    ttlFresh(1, async () => 1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("NO_TTL_CACHE=1 in production");
    warn.mockRestore();
  });
});
