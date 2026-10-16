import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ttl } from "@services/cache.ts";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("ttl", () => {
  it("returns the memoized value within the window and reloads after it", async () => {
    const load = vi.fn().mockResolvedValueOnce("a").mockResolvedValueOnce("b");
    const get = ttl(1000, load);
    expect(await get()).toBe("a");
    vi.advanceTimersByTime(999);
    expect(await get()).toBe("a");
    vi.advanceTimersByTime(2);
    expect(await get()).toBe("b");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    const load = vi.fn().mockResolvedValue("a");
    const get = ttl(1000, load);
    await Promise.all([get(), get()]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache a rejection", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("db down")).mockResolvedValueOnce("ok");
    const get = ttl(1000, load);
    await expect(get()).rejects.toThrow("db down");
    expect(await get()).toBe("ok");
  });
});
