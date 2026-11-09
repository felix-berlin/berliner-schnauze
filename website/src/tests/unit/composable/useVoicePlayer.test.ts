import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@stores/toastNotify.ts", () => ({ createToastNotify: vi.fn() }));
vi.mock("@utils/reportError.ts", () => ({ reportError: vi.fn() }));
vi.mock("@utils/wordPulse.ts", () => ({ reportWord: vi.fn() }));

class FakeAudio extends EventTarget {
  static last: FakeAudio;
  src = "";
  currentSrc = "";
  preload = "";
  error: { code: number } | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  constructor() {
    super();
    FakeAudio.last = this;
  }
}

const load = async () => {
  vi.resetModules();
  vi.stubGlobal("Audio", FakeAudio);
  const mod = await import("@composables/useVoicePlayer.ts");
  const toast = await import("@stores/toastNotify.ts");
  const report = await import("@utils/reportError.ts");
  const pulse = await import("@utils/wordPulse.ts");
  return {
    ...mod,
    createToastNotify: toast.createToastNotify,
    reportError: report.reportError,
    reportWord: pulse.reportWord,
  };
};

describe("useVoicePlayer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("plays, marks the key as playing and reports the pulse", async () => {
    const m = await load();
    const key = m.newVoiceKey();
    await m.toggleVoice(key, "/a.mp3", 3);
    expect(FakeAudio.last.src).toBe("/a.mp3");
    expect(m.isVoicePlaying(key)).toBe(true);
    expect(m.reportWord).toHaveBeenCalledWith(3, "audio");
  });

  it("ignores an AbortError from play() silently", async () => {
    const m = await load();
    const key = m.newVoiceKey();
    FakeAudio.last = undefined as never;
    await m.toggleVoice(key, "/a.mp3");
    FakeAudio.last.play.mockRejectedValueOnce(new DOMException("x", "AbortError"));
    await m.toggleVoice(m.newVoiceKey(), "/b.mp3");
    expect(m.reportError).not.toHaveBeenCalled();
    expect(m.createToastNotify).not.toHaveBeenCalled();
  });

  it("reports another play() error with src and shows a toast", async () => {
    const m = await load();
    const key = m.newVoiceKey();
    await m.toggleVoice(m.newVoiceKey(), "/a.mp3"); // creates the player
    FakeAudio.last.play.mockRejectedValueOnce(new DOMException("x", "NotAllowedError"));
    await m.toggleVoice(key, "/b.mp3");
    expect(m.isVoicePlaying(key)).toBe(false);
    expect(m.reportError).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(m.reportError).mock.calls[0][0])).toContain("/b.mp3");
    expect(m.createToastNotify).toHaveBeenCalledWith(expect.objectContaining({ status: "error" }));
  });

  it("a broken file (error event) is reported with its code and toasted once", async () => {
    const m = await load();
    const key = m.newVoiceKey();
    await m.toggleVoice(key, "/broken.mp3");
    FakeAudio.last.error = { code: 4 };
    FakeAudio.last.dispatchEvent(new Event("error"));
    expect(m.isVoicePlaying(key)).toBe(false);
    expect(m.reportError).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(m.reportError).mock.calls[0][0])).toContain("code 4");
    expect(m.createToastNotify).toHaveBeenCalledTimes(1);
  });

  it("an aborted load (code 1) is not reported", async () => {
    const m = await load();
    await m.toggleVoice(m.newVoiceKey(), "/a.mp3");
    FakeAudio.last.error = { code: 1 };
    FakeAudio.last.dispatchEvent(new Event("error"));
    expect(m.reportError).not.toHaveBeenCalled();
  });
});
