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
    .findAll("[style]")
    .map((el) => Number((el.element as HTMLElement).style.getPropertyValue("--fill-pct")));

describe("AnkiLetterCoverage", () => {
  it("starts on Lite with bars scaled by the lite ratio", () => {
    const wrapper = mount(AnkiLetterCoverage, { props });

    expect(wrapper.text()).toContain("31von 305 Wörtern");
    expect(wrapper.find("strong").text()).toBe("31");
    expect(
      wrapper
        .findAll("[style]")
        .map((el) => el.element.parentElement?.nextElementSibling?.textContent),
    ).toEqual(["A", "B"]);
    const [a, b] = fills(wrapper);
    expect(a).toBeCloseTo(31 / 305);
    expect(b).toBeCloseTo(0.5 * (31 / 305));
  });

  it("switches to the full distribution", async () => {
    const wrapper = mount(AnkiLetterCoverage, { props });
    const [lite, full] = wrapper.findAll("button");
    expect(lite?.text()).toBe("Lite");
    expect(full?.text()).toBe("Full");

    await full?.trigger("click");

    expect(full?.attributes("aria-pressed")).toBe("true");
    expect(wrapper.find("strong").text()).toBe("305");
    expect(fills(wrapper)).toEqual([1, 0.5]);
  });

  it("formats large numbers in German notation", () => {
    const wrapper = mount(AnkiLetterCoverage, {
      props: { ...props, liteWords: 1234, totalWords: 12345 },
    });

    expect(wrapper.find("strong").text()).toBe("1.234");
  });
});
