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

  it("onUnmounted cancels animation frame when playing (covers lines 87-88)", async () => {
    const cancelRafSpy = vi.spyOn(window, "cancelAnimationFrame");
    const wrapper = mount(AudioPlayer, { props: { audio: "test.mp3" } });
    await wrapper.find("button").trigger("click");
    wrapper.unmount();
    expect(cancelRafSpy).toHaveBeenCalled();
    cancelRafSpy.mockRestore();
  });
});
