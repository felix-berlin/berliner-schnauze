import { fetchJson } from "@services/fetchJson.ts";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fetchJson", () => {
  it("returns the parsed body and passes headers + a timeout signal", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ a: 1 }), ok: true });
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchJson("https://example.com", { X: "y" }, "Test")).toEqual({ a: 1 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.com");
    expect(init.headers).toEqual({ X: "y" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("logs the status and returns undefined on a non-ok response", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    expect(await fetchJson("https://example.com", {}, "Test")).toBeUndefined();
    expect(log).toHaveBeenCalledWith("Test request failed with status 503.");
  });

  it("logs and returns undefined when fetch throws", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));

    expect(await fetchJson("https://example.com", {}, "Test")).toBeUndefined();
    expect(log).toHaveBeenCalledWith("Test could not be fetched.");
  });
});
