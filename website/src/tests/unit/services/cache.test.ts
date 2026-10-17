import { ttl } from "@services/cache.ts";
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
