import LetterTiles from "@components/word/LetterTiles.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const props = {
  frequencies: [
    { char: "e", label: "sehr häufig", percent: 16.4 },
    { char: "x", label: "selten", percent: 0.03 },
  ],
  letters: [{ ch: "e", pct: 100, vowel: true }],
};

describe("LetterTiles", () => {
  it("keeps the controlled list in the DOM while collapsed", () => {
    const wrapper = mount(LetterTiles, { attachTo: document.body, props });
    const button = wrapper.get("button");
    const list = wrapper.get("#letter-frequencies");
    expect(button.attributes("aria-controls")).toBe("letter-frequencies");
    expect(button.attributes("aria-expanded")).toBe("false");
    expect(button.text()).toBe("Häufigkeiten als Zahlen zeigen");
    expect(list.isVisible()).toBe(false);
    wrapper.unmount();
  });

  it("toggles label, aria-expanded and visibility, with comma formatting", async () => {
    const wrapper = mount(LetterTiles, { attachTo: document.body, props });
    await wrapper.get("button").trigger("click");
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("true");
    expect(wrapper.get("button").text()).toBe("Häufigkeiten ausblenden");
    expect(wrapper.get("#letter-frequencies").isVisible()).toBe(true);
    expect(wrapper.get("#letter-frequencies").text()).toContain("16,40 % · sehr häufig");
    expect(wrapper.get("#letter-frequencies").text()).toContain("0,03 % · selten");
    wrapper.unmount();
  });
});
