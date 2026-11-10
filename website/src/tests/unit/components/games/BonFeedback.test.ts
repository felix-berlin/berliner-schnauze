import type { RoundEntry } from "@composables/useBon";

import BonFeedback from "@components/games/BonFeedback.vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

const right: RoundEntry = {
  correct: true,
  isReal: true,
  multiplier: 2,
  points: 20,
  slug: "knorke",
  translation: "großartig",
  word: "Knorke",
};
const wrong: RoundEntry = {
  category: "invented",
  correct: false,
  isReal: false,
  multiplier: 1,
  points: 0,
  word: "Blubberkram",
};

function fb(last: RoundEntry, extra: { gameOver?: boolean; lives?: number } = {}) {
  return mount(BonFeedback, { props: { gameOver: false, last, ...extra } });
}

// jsdom has no PointerEvent, so a MouseEvent under the pointer event name stands in.
function fire(wrapper: ReturnType<typeof fb>, type: string, clientX = 0, pointerType = "touch") {
  const event = new MouseEvent(type, { bubbles: true, clientX });
  Object.assign(event, { pointerType });
  wrapper.find(".c-bon-feedback__card").element.dispatchEvent(event);
}

describe("BonFeedback.vue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("emits next after exactly 900 ms when right", () => {
    const wrapper = fb(right);
    vi.advanceTimersByTime(899);
    expect(wrapper.emitted("next")).toBeUndefined();
    vi.advanceTimersByTime(1);
    expect(wrapper.emitted("next")).toHaveLength(1);
  });

  it("emits next after 2500 ms when wrong, and for game over with the result hint", () => {
    const wrapper = fb(wrong, { gameOver: true });
    expect(wrapper.text()).toContain("Gleich kommt dein Ergebnis – tippen für sofort.");
    vi.advanceTimersByTime(2499);
    expect(wrapper.emitted("next")).toBeUndefined();
    vi.advanceTimersByTime(1);
    expect(wrapper.emitted("next")).toHaveLength(1);
  });

  it("pauses on pointerenter/pointerdown and continues 1200 ms after leave/up", async () => {
    const wrapper = fb(right);
    fire(wrapper, "pointerenter");
    await nextTick();
    vi.advanceTimersByTime(10_000);
    expect(wrapper.emitted("next")).toBeUndefined();
    expect(
      wrapper.find<HTMLElement>(".c-bon-feedback__timer").element.style.animationPlayState,
    ).toBe("paused");
    fire(wrapper, "pointerleave");
    vi.advanceTimersByTime(1199);
    expect(wrapper.emitted("next")).toBeUndefined();
    vi.advanceTimersByTime(1);
    expect(wrapper.emitted("next")).toHaveLength(1);

    const touch = fb(wrong);
    fire(touch, "pointerdown", 50);
    vi.advanceTimersByTime(10_000);
    expect(touch.emitted("next")).toBeUndefined();
    fire(touch, "pointerup", 50);
    vi.advanceTimersByTime(1200);
    expect(touch.emitted("next")).toHaveLength(1);
  });

  it("a mouse stays paused after pointerup until it leaves", () => {
    const wrapper = fb(wrong);
    fire(wrapper, "pointerenter", 0, "mouse");
    fire(wrapper, "pointerup", 0, "mouse");
    vi.advanceTimersByTime(10_000);
    expect(wrapper.emitted("next")).toBeUndefined();
  });

  it("goes on at once on click or swipe, and only once", async () => {
    const clicked = fb(right);
    vi.advanceTimersByTime(250);
    await clicked.find(".c-bon-feedback__card").trigger("click");
    vi.advanceTimersByTime(5000);
    expect(clicked.emitted("next")).toHaveLength(1);

    const swiped = fb(right);
    vi.advanceTimersByTime(250);
    fire(swiped, "pointerdown", 10);
    fire(swiped, "pointerup", 120);
    await swiped.find(".c-bon-feedback__card").trigger("click");
    expect(swiped.emitted("next")).toHaveLength(1);
  });

  it("copy for a right answer: Richtig!, Knorke from x3, points", () => {
    expect(fb(right).text()).toContain("Richtig!");
    expect(fb(right).text()).toContain("= großartig");
    expect(fb(right).text()).toContain("+20 Punkte (×2)");
    const streak = fb({ ...right, multiplier: 3, points: 30 });
    expect(streak.text()).toContain("Knorke, weiter so!");
    expect(fb({ ...right, multiplier: 1, points: 10 }).text()).toContain("+10 Punkte");
    expect(fb(right).find(".c-bon-feedback__card--right").exists()).toBe(true);
  });

  it.each([
    [{ ...wrong }, "Dit Wort is erfunden – jibt’s nich."],
    [{ ...wrong, category: "hochdeutsch" as const }, "Dit is Hochdeutsch, keen Berlinerisch."],
    [{ ...right, correct: false }, "Dit is echtes Berlinerisch:"],
  ])("wrong answer says the sentence for its category", (last, sentence) => {
    const wrapper = fb(last);
    expect(wrapper.find(".c-bon-feedback__verdict").text()).toBe(sentence);
    expect(wrapper.text()).toContain("Daneben!");
    expect(wrapper.text()).toContain("−1 Leben · Serie futsch");
    expect(wrapper.find(".c-bon-feedback__card--wrong").exists()).toBe(true);
  });

  it("links real words to their page in a new tab, others not", () => {
    const link = fb({ ...right, correct: false }).find("a");
    expect(link.text()).toBe("Mehr zu „Knorke“ ↗");
    expect(link.attributes("href")).toBe("/wort/knorke");
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("rel")).toBe("noopener");
    expect(fb(wrong).find("a").exists()).toBe(false);
    expect(fb(right).find("a").exists()).toBe(false);
  });

  it("announces a status text", () => {
    expect(fb(right).find("[role=status]").text()).toBe(
      "Richtig! Knorke heißt großartig. Plus 20 Punkte.",
    );
    expect(fb(wrong, { lives: 1 }).find("[role=status]").text()).toBe(
      "Daneben! Dit Wort is erfunden – jibt’s nich. Noch 1 Leben.",
    );
  });

  it("the timer bar runs for the standing time", () => {
    const bar = (w: ReturnType<typeof fb>) =>
      w.find<HTMLElement>(".c-bon-feedback__timer").element.style.animationDuration;
    expect(bar(fb(right))).toBe("900ms");
    expect(bar(fb(wrong))).toBe("2500ms");
  });

  it("drops a tap in the first 250 ms without losing the timer, accepts one later", async () => {
    const early = fb(wrong);
    vi.advanceTimersByTime(100);
    await early.find(".c-bon-feedback__card").trigger("click");
    expect(early.emitted("next")).toBeUndefined();
    vi.advanceTimersByTime(2400);
    expect(early.emitted("next")).toHaveLength(1);

    const late = fb(wrong);
    vi.advanceTimersByTime(100);
    await late.find(".c-bon-feedback__card").trigger("click");
    vi.advanceTimersByTime(150);
    await late.find(".c-bon-feedback__card").trigger("click");
    expect(late.emitted("next")).toHaveLength(1);
  });

  it("restarts the bar over the 1200 ms grace period after a pause", async () => {
    const wrapper = fb(wrong);
    fire(wrapper, "pointerenter");
    fire(wrapper, "pointerleave");
    await nextTick();
    expect(
      wrapper.find<HTMLElement>(".c-bon-feedback__timer").element.style.animationDuration,
    ).toBe("1200ms");
  });

  it("has no double space in the status text without a translation", () => {
    const text = fb({ ...right, translation: undefined })
      .find("[role=status]")
      .text();
    expect(text).toBe("Richtig! Plus 20 Punkte.");
  });
});
