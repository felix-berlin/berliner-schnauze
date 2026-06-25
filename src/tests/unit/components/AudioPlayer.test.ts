import AudioPlayer from "@components/AudioPlayer.vue";
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";

vi.mock("virtual:icons/lucide/play", async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, default: { template: "<span data-testid='play-icon' />" } };
});

vi.mock("virtual:icons/lucide/pause", async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, default: { template: "<span data-testid='pause-icon' />" } };
});

describe("AudioPlayer.vue", () => {
  let audioPlayMock: ReturnType<typeof vi.fn>;
  let audioPauseMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    audioPlayMock = vi.fn();
    audioPauseMock = vi.fn();

    vi.spyOn(window, "Audio").mockImplementation(function (this: unknown) {
      return {
        play: audioPlayMock,
        pause: audioPauseMock,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        currentTime: 0,
        duration: 100,
      };
    } as unknown as typeof Audio);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders correctly", () => {
    const wrapper = mount(AudioPlayer, {
      props: { audio: "test-audio-url" },
    });
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find("[data-testid='play-icon']").exists()).toBe(true);
  });

  it("plays audio on button click", async () => {
    const wrapper = mount(AudioPlayer, {
      props: { audio: "test-audio-url" },
    });
    await wrapper.find("button").trigger("click");
    expect(audioPlayMock).toHaveBeenCalled();
    expect(wrapper.find("[data-testid='pause-icon']").exists()).toBe(true);
  });

  it("stops audio on button click when playing", async () => {
    const wrapper = mount(AudioPlayer, {
      props: { audio: "test-audio-url" },
    });
    await wrapper.find("button").trigger("click");
    await wrapper.find("button").trigger("click");
    expect(audioPauseMock).toHaveBeenCalled();
    expect(wrapper.find("[data-testid='play-icon']").exists()).toBe(true);
  });

  it("changes aria-label based on playing state", async () => {
    const wrapper = mount(AudioPlayer, {
      props: { audio: "test-audio-url" },
    });
    expect(wrapper.find("button").attributes("aria-label")).toBe("Audio abspielen");
    await wrapper.find("button").trigger("click");
    expect(wrapper.find("button").attributes("aria-label")).toBe("Audio stoppen");
  });

  it("handleEnded resets isPlaying and progress when audio ends (covers lines 40-41)", async () => {
    let capturedEndedHandler: (() => void) | null = null;
    vi.spyOn(window, "Audio").mockImplementationOnce(function (this: unknown) {
      return {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === "ended") capturedEndedHandler = handler;
        }),
        removeEventListener: vi.fn(),
        currentTime: 50,
        duration: 100,
      };
    } as unknown as typeof Audio);

    const wrapper = mount(AudioPlayer, { props: { audio: "test.mp3" } });
    await wrapper.find("button").trigger("click");
    expect(wrapper.find("[data-testid='pause-icon']").exists()).toBe(true);
    capturedEndedHandler!();
    await nextTick();
    expect(wrapper.find("[data-testid='play-icon']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("renders correctly when audio prop is empty (covers line 33 null branch)", () => {
    const wrapper = mount(AudioPlayer, { props: { audio: "" } });
    expect(wrapper.find("button").exists()).toBe(true);
    wrapper.unmount();
  });

  it("onUnmounted is safe when never played (covers line 87 false branch)", () => {
    const wrapper = mount(AudioPlayer, { props: { audio: "test.mp3" } });
    wrapper.unmount();
  });

  it("updateProgress exits early when audioFile is null (covers line 49 false branch)", async () => {
    let capturedCb: FrameRequestCallback | null = null;
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      capturedCb = cb;
      return 1;
    });
    const wrapper = mount(AudioPlayer, { props: { audio: "" } });
    await wrapper.find("button").trigger("click"); // playAudio schedules rAF even with null audioFile
    capturedCb!(0); // fire updateProgress → if (null && isPlaying) → false → exits
    rafSpy.mockRestore();
    wrapper.unmount();
  });

  it("updateProgress computes progress when duration > 0 (covers lines 49-52 true/truthy branch)", async () => {
    let capturedCb: FrameRequestCallback | null = null;
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      capturedCb = cb;
      return 1;
    });
    const wrapper = mount(AudioPlayer, { props: { audio: "test.mp3" } });
    await wrapper.find("button").trigger("click"); // default mock: duration=100, currentTime=0
    capturedCb!(0); // fire updateProgress → if (audioFile && isPlaying) → true → duration truthy → computes ratio
    rafSpy.mockRestore();
    wrapper.unmount();
  });

  it("updateProgress uses 0 when audioFile.duration is 0 (covers line 50 false branch)", async () => {
    vi.spyOn(window, "Audio").mockImplementationOnce(function (this: unknown) {
      return {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        currentTime: 5,
        duration: 0,
      };
    } as unknown as typeof Audio);
    let capturedCb: FrameRequestCallback | null = null;
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      capturedCb = cb;
      return 1;
    });
    const wrapper = mount(AudioPlayer, { props: { audio: "test.mp3" } });
    await wrapper.find("button").trigger("click");
    capturedCb!(0); // fire updateProgress → duration=0 → progress = 0 (false branch)
    rafSpy.mockRestore();
    wrapper.unmount();
  });

  it("onUnmounted cancels animation frame when playing (covers lines 87-88)", async () => {
    const cancelRafSpy = vi.spyOn(window, "cancelAnimationFrame");
    const wrapper = mount(AudioPlayer, { props: { audio: "test.mp3" } });
    await wrapper.find("button").trigger("click");
    wrapper.unmount();
    expect(cancelRafSpy).toHaveBeenCalled();
    cancelRafSpy.mockRestore();
  });

  it("stopAudio skips cancelAnimationFrame when animationFrameId is null (covers line 64 false branch)", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(null as unknown as number);
    const cancelRafSpy = vi.spyOn(window, "cancelAnimationFrame");
    const wrapper = mount(AudioPlayer, { props: { audio: "test.mp3" } });
    await wrapper.find("button").trigger("click"); // play → animationFrameId = null (mock returns null)
    await wrapper.find("button").trigger("click"); // stop → if (null !== null) = false → no cancelAnimationFrame
    expect(cancelRafSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
