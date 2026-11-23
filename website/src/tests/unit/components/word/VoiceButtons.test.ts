import VoiceButtons from "@components/word/VoiceButtons.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const player = vi.hoisted(() => ({
  isVoicePlaying: vi.fn((key: string) => key === "voice-1-weiblich"),
  newVoiceKey: vi.fn(() => "voice-1"),
  toggleVoice: vi.fn(),
}));
vi.mock("@composables/useVoicePlayer.ts", () => player);

describe("VoiceButtons", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders one button per available voice, none without files", () => {
    expect(
      mount(VoiceButtons, { props: { sources: { m: "/m.mp3", w: "/w.mp3" } } })
        .findAll("button")
        .map((b) => b.text()),
    ).toEqual(["männlich", "weiblich"]);
    expect(
      mount(VoiceButtons, { props: { sources: { w: "/w.mp3" } } }).findAll("button"),
    ).toHaveLength(1);
    expect(
      mount(VoiceButtons, { props: { sources: {} } })
        .find(".c-voice-buttons")
        .exists(),
    ).toBe(false);
  });

  it("puts the female voice first with order wm (SPEC §6), the default keeps male first", () => {
    const texts = (order?: "mw" | "wm") =>
      mount(VoiceButtons, {
        props: { sources: { m: "/m.mp3", w: "/w.mp3" }, ...(order && { order }) },
      })
        .findAll("button")
        .map((b) => b.text());
    expect(texts("wm")).toEqual(["weiblich", "männlich"]);
    expect(texts("mw")).toEqual(["männlich", "weiblich"]);
    expect(texts()).toEqual(["männlich", "weiblich"]);
  });

  it("marks only the playing voice as pressed and toggles the clicked one with its file and word", async () => {
    const w = mount(VoiceButtons, { props: { sources: { m: "/m.mp3", w: "/w.mp3" }, wordId: 4 } });
    const [male, female] = w.findAll("button");
    expect(male!.attributes("aria-pressed")).toBe("false");
    expect(female!.attributes("aria-pressed")).toBe("true");
    await male!.trigger("click");
    expect(player.toggleVoice).toHaveBeenCalledWith("voice-1-männlich", "/m.mp3", 4);
  });
});
