// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "bsw-pulse";
const fetchMock = vi.fn();
let reportWord: typeof import("@utils/wordPulse.ts").reportWord;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  vi.resetModules(); // the module keeps an in-memory fallback set
  ({ reportWord } = await import("@utils/wordPulse.ts"));
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-05T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
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

  it("sends the same word and kind only once per day", async () => {
    reportWord(7, "view");
    await flush();
    reportWord(7, "view");
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

  it("sends again on the next Berlin day and drops old entries", async () => {
    reportWord(7, "view");
    await flush();
    // 22:30Z is already Nov 6 in Berlin
    vi.setSystemTime(new Date("2026-11-05T23:30:00Z"));
    reportWord(8, "view");
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual({
      day: "2026-11-06",
      seen: ["8:view"],
    });
  });

  it("still sends and does not throw when localStorage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => reportWord(9, "share")).not.toThrow();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  it("dedupes in memory when localStorage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    reportWord(12, "view");
    await flush();
    reportWord(12, "view");
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    reportWord(12, "audio");
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
