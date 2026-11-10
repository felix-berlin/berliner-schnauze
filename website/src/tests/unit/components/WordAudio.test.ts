import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

const reportWord = vi.hoisted(() => vi.fn());
vi.mock("@utils/wordPulse.ts", () => ({ reportWord }));

// One fake element per `new Audio()`; the shared player must create exactly one.
const audios: { listeners: Record<string, () => void>; src: string; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; preload: string }[] = [];

beforeEach(() => {
  vi.resetModules();
  audios.length = 0;
  reportWord.mockClear();
  vi.spyOn(window, "Audio").mockImplementation(function () {
    const audio = {
      addEventListener: (type: string, fn: () => void) => (audio.listeners[type] = fn),
      listeners: {} as Record<string, () => void>,
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      preload: "",
      src: "",
    };
    audios.push(audio);
    return audio;
  } as unknown as typeof Audio);
});

afterEach(() => vi.restoreAllMocks());

const flush = async () => {
  await Promise.resolve();
  await nextTick();
};

const load = async () => ({
  VoiceButtons: (await import("@components/word/VoiceButtons.vue")).default,
  WordAudio: (await import("@components/word/WordAudio.vue")).default,
});

describe("WordAudio.vue", () => {
  it("renders one button when only the male voice exists", async () => {
    const { WordAudio } = await load();
    const wrapper = mount(WordAudio, { props: { sources: { m: "/m.mp3" } } });
    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.text()).toBe("Männlich");
  });

  it("renders nothing without a voice", async () => {
    const { WordAudio } = await load();
    const wrapper = mount(WordAudio, { props: { sources: {} } });
    expect(wrapper.html()).toBe("<!--v-if-->");
  });

  it("labels the group with Anhören", async () => {
    const { WordAudio } = await load();
    const wrapper = mount(WordAudio, { props: { sources: { m: "/m.mp3", w: "/w.mp3" } } });
    const group = wrapper.find("[role=group]");
    expect(wrapper.find(`#${group.attributes("aria-labelledby")}`).text()).toBe("Anhören");
    expect(wrapper.findAll("button").map((b) => b.text())).toEqual(["Männlich", "Weiblich"]);
  });

  it("starts a voice, stops it with a second click and reports the pulse", async () => {
    const { WordAudio } = await load();
    const wrapper = mount(WordAudio, { props: { sources: { m: "/m.mp3" }, wordId: 7 } });
    const [button] = wrapper.findAll("button");
    await button!.trigger("click");
    await flush();
    expect(audios).toHaveLength(1);
    expect(audios[0]!.preload).toBe("none");
    expect(audios[0]!.src).toContain("/m.mp3");
    expect(button!.attributes("aria-pressed")).toBe("true");
    expect(reportWord).toHaveBeenCalledWith(7, "audio");
    await button!.trigger("click");
    expect(audios[0]!.pause).toHaveBeenCalled();
    expect(button!.attributes("aria-pressed")).toBe("false");
  });

  it("does not report a pulse for a draft (no wordId)", async () => {
    const { WordAudio } = await load();
    const wrapper = mount(WordAudio, { props: { sources: { m: "/m.mp3" } } });
    await wrapper.find("button").trigger("click");
    await flush();
    expect(reportWord).not.toHaveBeenCalled();
  });

  it("stops the male voice when the female one starts", async () => {
    const { WordAudio } = await load();
    const wrapper = mount(WordAudio, { props: { sources: { m: "/m.mp3", w: "/w.mp3" } } });
    const [m, w] = wrapper.findAll("button");
    await m!.trigger("click");
    await flush();
    await w!.trigger("click");
    await flush();
    expect(m!.attributes("aria-pressed")).toBe("false");
    expect(w!.attributes("aria-pressed")).toBe("true");
    expect(audios[0]!.src).toContain("/w.mp3");
  });

  it("returns to idle when the audio ends", async () => {
    const { WordAudio } = await load();
    const wrapper = mount(WordAudio, { props: { sources: { m: "/m.mp3" } } });
    const button = wrapper.find("button");
    await button.trigger("click");
    await flush();
    audios[0]!.listeners.ended!();
    await nextTick();
    expect(button.attributes("aria-pressed")).toBe("false");
  });

  it("returns to idle when the file cannot be played", async () => {
    const { WordAudio } = await load();
    const wrapper = mount(WordAudio, { props: { sources: { m: "/m.mp3" } } });
    const button = wrapper.find("button");
    await button.trigger("click");
    await flush();
    audios[0]!.listeners.error!();
    await nextTick();
    expect(button.attributes("aria-pressed")).toBe("false");
  });

  it("stops a playing example voice when a word voice starts", async () => {
    const { VoiceButtons, WordAudio } = await load();
    const example = mount(VoiceButtons, { props: { sources: { m: "/ex.mp3" } } });
    const word = mount(WordAudio, { props: { sources: { m: "/m.mp3" } } });
    await example.find("button").trigger("click");
    await flush();
    expect(example.find("button").attributes("aria-pressed")).toBe("true");
    await word.find("button").trigger("click");
    await flush();
    expect(example.find("button").attributes("aria-pressed")).toBe("false");
    expect(word.find("button").attributes("aria-pressed")).toBe("true");
  });

  it("tracks buttons, not files: the same file on an example does not light up twice", async () => {
    const { VoiceButtons, WordAudio } = await load();
    const example = mount(VoiceButtons, { props: { sources: { m: "/m.mp3" } } });
    const word = mount(WordAudio, { props: { sources: { m: "/m.mp3" } } });
    await word.find("button").trigger("click");
    await flush();
    expect(word.find("button").attributes("aria-pressed")).toBe("true");
    expect(example.find("button").attributes("aria-pressed")).toBe("false");
  });
});
