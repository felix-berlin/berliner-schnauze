import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AudioPlayer from "@components/AudioPlayer.vue";
import Play from "virtual:icons/lucide/play";
import Pause from "virtual:icons/lucide/pause";

vi.mock("virtual:icons/lucide/play", () => ({
  default: { template: "<div>Play Icon</div>" },
}));

vi.mock("virtual:icons/lucide/pause", () => ({
  default: { template: "<div>Pause Icon</div>" },
}));

describe("AudioPlayer.vue", () => {
  let audioPlayMock: ReturnType<typeof vi.fn>;
  let audioPauseMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    audioPlayMock = vi.fn();
    audioPauseMock = vi.fn();

    vi.spyOn(window, "Audio").mockImplementation(function (this: any) {
      return {
        play: audioPlayMock,
        pause: audioPauseMock,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        currentTime: 0,
        duration: 100,
      };
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders correctly", () => {
    const wrapper = mount(AudioPlayer, {
      props: { audio: "test-audio-url" },
    });
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.findComponent(Play).exists()).toBe(true);
  });

  it("plays audio on button click", async () => {
    const wrapper = mount(AudioPlayer, {
      props: { audio: "test-audio-url" },
    });
    await wrapper.find("button").trigger("click");
    expect(audioPlayMock).toHaveBeenCalled();
    expect(wrapper.findComponent(Pause).exists()).toBe(true);
  });

  it("stops audio on button click when playing", async () => {
    const wrapper = mount(AudioPlayer, {
      props: { audio: "test-audio-url" },
    });
    await wrapper.find("button").trigger("click"); // Play
    await wrapper.find("button").trigger("click"); // Stop
    expect(audioPauseMock).toHaveBeenCalled();
    expect(wrapper.findComponent(Play).exists()).toBe(true);
  });

  it("changes aria-label based on playing state", async () => {
    const wrapper = mount(AudioPlayer, {
      props: { audio: "test-audio-url" },
    });
    expect(wrapper.find("button").attributes("aria-label")).toBe("Audio abspielen");
    await wrapper.find("button").trigger("click"); // Play
    expect(wrapper.find("button").attributes("aria-label")).toBe("Audio stoppen");
  });
});
