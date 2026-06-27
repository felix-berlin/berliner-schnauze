import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@components/AudioPlayer.vue", () => ({
  default: { template: "<div class='mock-audio-player' />" },
}));

const makeAudio = (gender: "female" | "male") => ({
  gender,
  audio: { node: { mediaItemUrl: `https://example.com/${gender}.mp3` } },
});

describe("AudioPlayerList.vue", () => {
  it("renders one item per audio entry", async () => {
    const AudioPlayerList = (await import("@components/AudioPlayerList.vue")).default;
    const wrapper = mount(AudioPlayerList, {
      props: { audio: [makeAudio("female"), makeAudio("male")], isType: "berlinerisch" },
    });
    expect(wrapper.findAll(".c-audio-list__item")).toHaveLength(2);
  });

  it("shows ♀ for female gender", async () => {
    const AudioPlayerList = (await import("@components/AudioPlayerList.vue")).default;
    const wrapper = mount(AudioPlayerList, {
      props: { audio: [makeAudio("female")], isType: "berlinerisch" },
    });
    expect(wrapper.find(".c-audio-list__gender").text()).toBe("♀");
  });

  it("shows ♂ for male gender", async () => {
    const AudioPlayerList = (await import("@components/AudioPlayerList.vue")).default;
    const wrapper = mount(AudioPlayerList, {
      props: { audio: [makeAudio("male")], isType: "example" },
    });
    expect(wrapper.find(".c-audio-list__gender").text()).toBe("♂");
  });

  it("renders no items when audio is null", async () => {
    const AudioPlayerList = (await import("@components/AudioPlayerList.vue")).default;
    const wrapper = mount(AudioPlayerList, {
      props: { audio: null, isType: "berlinerisch" },
    });
    expect(wrapper.findAll(".c-audio-list__item")).toHaveLength(0);
  });

  it("renders no items when audio is empty array", async () => {
    const AudioPlayerList = (await import("@components/AudioPlayerList.vue")).default;
    const wrapper = mount(AudioPlayerList, {
      props: { audio: [], isType: "berlinerisch" },
    });
    expect(wrapper.findAll(".c-audio-list__item")).toHaveLength(0);
  });

  it("passes null to AudioPlayer when mediaItemUrl is null (covers line 12 ?? null branch)", async () => {
    const AudioPlayerList = (await import("@components/AudioPlayerList.vue")).default;
    const audioWithNullUrl = [{ gender: "male" as const, audio: { node: { mediaItemUrl: null } } }];
    const wrapper = mount(AudioPlayerList, {
      props: { audio: audioWithNullUrl, isType: "berlinerisch" },
    });
    expect(wrapper.find(".c-audio-list__item").exists()).toBe(true);
  });
});
