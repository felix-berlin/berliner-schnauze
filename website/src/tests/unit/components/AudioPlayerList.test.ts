import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@components/AudioPlayer.vue", () => ({
  default: { template: "<div class='mock-audio-player' />" },
}));

const makeAudio = (gender: "female" | "male") => ({
  audio: { id: 1, url: `https://example.com/${gender}.mp3` },
  gender,
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

  it("renders no items when audio is empty array", async () => {
    const AudioPlayerList = (await import("@components/AudioPlayerList.vue")).default;
    const wrapper = mount(AudioPlayerList, {
      props: { audio: [], isType: "berlinerisch" },
    });
    expect(wrapper.findAll(".c-audio-list__item")).toHaveLength(0);
  });

  it("passes the media url to the player", async () => {
    const AudioPlayerList = (await import("@components/AudioPlayerList.vue")).default;
    const wrapper = mount(AudioPlayerList, {
      props: { audio: [makeAudio("male")], isType: "berlinerisch" },
    });
    // the mocked player declares no props: `audio` falls through as an attribute
    expect(wrapper.find(".mock-audio-player").attributes("audio")).toBe("https://example.com/male.mp3");
  });
});
