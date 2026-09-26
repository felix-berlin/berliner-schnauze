import AnkiLetterCoverage from "@components/anki/AnkiLetterCoverage.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const props = {
  letterCounts: { A: 200, B: 100, Sonstige: 5 },
  letters: ["A", "B"],
  liteWords: 31,
  totalWords: 305,
};

const fills = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .findAll(".c-anki-coverage__fill")
    .map((el) => Number((el.element as HTMLElement).style.getPropertyValue("--fill-pct")));

describe("AnkiLetterCoverage", () => {
  it("starts on Lite with bars scaled by the lite ratio", () => {
    const wrapper = mount(AnkiLetterCoverage, { props });

    expect(wrapper.find(".c-anki-coverage__count strong").text()).toBe("31");
    expect(wrapper.find(".c-anki-coverage__count span").text()).toBe("von 305 Wörtern");
    expect(wrapper.findAll(".c-anki-coverage__letter").map((l) => l.text())).toEqual(["A", "B"]);
    const [a, b] = fills(wrapper);
    expect(a).toBeCloseTo(31 / 305);
    expect(b).toBeCloseTo(0.5 * (31 / 305));
  });

  it("switches to the full distribution", async () => {
    const wrapper = mount(AnkiLetterCoverage, { props });
    const [, full] = wrapper.findAll(".c-anki-coverage__toggle button");

    await full?.trigger("click");

    expect(full?.classes()).toContain("is-current");
    expect(wrapper.find(".c-anki-coverage__count strong").text()).toBe("305");
    expect(fills(wrapper)).toEqual([1, 0.5]);
  });

  it("formats large numbers in German notation", () => {
    const wrapper = mount(AnkiLetterCoverage, {
      props: { ...props, liteWords: 1234, totalWords: 12345 },
    });

    expect(wrapper.find(".c-anki-coverage__count strong").text()).toBe("1.234");
  });
});
