// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
let reportWord: typeof import("@utils/wordPulse.ts").reportWord;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  vi.resetModules(); // the module keeps an in-memory set
  ({ reportWord } = await import("@utils/wordPulse.ts"));
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("reportWord", () => {
  it("posts word and kind", async () => {
    reportWord(7, "view");
    await flush();
    expect(fetchMock).toHaveBeenCalledWith("/api/word-pulse", {
      body: JSON.stringify({ kind: "view", word: 7 }),
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      method: "POST",
    });
  });

  it("sends the same word and kind only once per page load", async () => {
    reportWord(7, "view");
    await flush();
    reportWord(7, "view");
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends one report for synchronous repeats", async () => {
    reportWord(7, "audio");
    reportWord(7, "audio");
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends another kind or another word", async () => {
    reportWord(7, "view");
    reportWord(7, "audio");
    reportWord(8, "view");
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("never touches the browser's storage", async () => {
    const get = vi.spyOn(Storage.prototype, "getItem");
    const set = vi.spyOn(Storage.prototype, "setItem");
    reportWord(9, "share");
    await flush();
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  it("swallows a failing fetch and does not remember the attempt", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(() => reportWord(10, "click")).not.toThrow();
    await flush();
    reportWord(10, "click");
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not remember a non-ok response", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    reportWord(11, "view");
    await flush();
    reportWord(11, "view");
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not throw when fetch throws synchronously", () => {
    fetchMock.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    expect(() => reportWord(13, "view")).not.toThrow();
  });
});
