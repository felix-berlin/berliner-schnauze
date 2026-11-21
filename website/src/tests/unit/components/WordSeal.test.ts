import type { MorseMark } from "payload-app/home-stats";

import WordSeal from "@components/WordSeal.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { vTooltip } from "@/directives/tooltip";

const mark = (sym: MorseMark["sym"]): MorseMark => ({ angle: 0, sym, x: 50, y: 5 });
// Invented ring: three marks.
const morse = [mark("dash"), mark("dot"), mark("dot")];

const seal = (props: Partial<InstanceType<typeof WordSeal>["$props"]> = {}) =>
  mount(WordSeal, {
    global: { directives: { tooltip: vTooltip } },
    props: { audioUrl: "/kiez.mp3", morse, word: "Kiez", ...props },
  });

const onMarks = (w: ReturnType<typeof seal>) =>
  w.findAll("i[data-sym]").filter((i) => i.attributes("data-state") !== undefined).length;

describe("WordSeal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders one mark per morse sign inside a ring labelled with the word", () => {
    const w = seal();
    const marks = w.findAll("i[data-sym]");
    expect(marks).toHaveLength(3);
    expect(marks.map((i) => i.attributes("data-sym"))).toEqual(["dash", "dot", "dot"]);
    const ring = marks[0]!.element.parentElement!;
    expect(ring.getAttribute("aria-label")).toBe("Morsecode von Kiez");
    expect(ring.getAttribute("tabindex")).toBe("0");
  });

  it("loads the audio only on click", () => {
    expect(seal().find("audio").attributes("preload")).toBe("none");
  });

  it("toggles the button label and emits play and end", async () => {
    const w = seal();
    const button = w.get("button");
    expect(button.attributes("aria-label")).toBe("Kiez anhören");
    await button.trigger("click");
    await flushPromises();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(button.attributes("aria-label")).toBe("Anhalten");
    expect(w.emitted("play")).toHaveLength(1);
    await button.trigger("click");
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(button.attributes("aria-label")).toBe("Kiez anhören");
    expect(w.emitted("end")).toHaveLength(1);
    expect(onMarks(w)).toBe(0);
  });

  it("lights the marks one after another at 120 ms while the duration is unknown", async () => {
    const w = seal();
    await w.get("button").trigger("click");
    await flushPromises();
    expect(onMarks(w)).toBe(1);
    await vi.advanceTimersByTimeAsync(120);
    expect(onMarks(w)).toBe(2);
    await vi.advanceTimersByTimeAsync(120);
    expect(onMarks(w)).toBe(3);
    // only the current mark is "now"
    expect(w.findAll('i[data-state="now"]')).toHaveLength(1);
  });

  it("starts the marks only when playback starts, not on the click", async () => {
    let start!: () => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValue(
      new Promise<void>((resolve) => (start = resolve)),
    );
    const w = seal();
    await w.get("button").trigger("click");
    // slow connection: the file is still loading
    await vi.advanceTimersByTimeAsync(1000);
    expect(onMarks(w)).toBe(0);
    start();
    await flushPromises();
    expect(onMarks(w)).toBe(1);
    await vi.advanceTimersByTimeAsync(120);
    expect(onMarks(w)).toBe(2);
  });

  it("spreads the marks over the audio duration once it is known", async () => {
    const w = seal();
    const audio = w.get("audio").element as HTMLAudioElement;
    Object.defineProperty(audio, "duration", { configurable: true, value: 3 });
    await w.get("button").trigger("click");
    await flushPromises();
    await vi.advanceTimersByTimeAsync(120);
    expect(onMarks(w)).toBe(1); // 1 s per mark, not 120 ms
    Object.defineProperty(audio, "currentTime", { configurable: true, value: 1.1 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(onMarks(w)).toBe(2);
  });

  it("returns to rest when the audio ends", async () => {
    const w = seal();
    await w.get("button").trigger("click");
    await flushPromises();
    await w.get("audio").trigger("ended");
    expect(w.get("button").attributes("aria-label")).toBe("Kiez anhören");
    expect(w.emitted("end")).toHaveLength(1);
    expect(onMarks(w)).toBe(0);
  });

  it("shows the initial instead of a button without audio, the ring stays", () => {
    const w = seal({ audioUrl: undefined });
    expect(w.find("button").exists()).toBe(false);
    expect(w.find("audio").exists()).toBe(false);
    const initial = w.get('[aria-hidden="true"]:not(span)');
    expect(initial.text()).toBe("K");
    expect(w.findAll("i[data-sym]")).toHaveLength(3);
    expect(seal({ audioUrl: undefined, initial: "Q" }).text()).toContain("Q");
  });

  it("renders an empty ring without a crash for a word without morse letters", () => {
    const w = seal({ morse: [], word: "-" });
    expect(w.findAll("i[data-sym]")).toHaveLength(0);
    expect(w.find("button").exists()).toBe(true);
  });
});
