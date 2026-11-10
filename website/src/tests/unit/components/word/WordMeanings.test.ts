import WordMeanings from "@components/word/WordMeanings.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const make = (n: number) => Array.from({ length: n }, (_, i) => `Bedeutung ${i + 1}`);

describe("WordMeanings", () => {
  it("renders one meaning as p.t-em with the singular label", () => {
    const w = mount(WordMeanings, { props: { meanings: make(1) } });
    expect(w.find(".t-label").text()).toBe("Bedeutung");
    expect(w.find("p.t-em").text()).toBe("Bedeutung 1");
    expect(w.find("ol").exists()).toBe(false);
    expect(w.find("button").exists()).toBe(false);
  });

  it("renders a numbered list from two meanings on, without a button up to five", () => {
    const w = mount(WordMeanings, { props: { meanings: make(5) } });
    expect(w.find(".t-label").text()).toBe("Bedeutungen");
    expect(w.findAll("ol.c-meanings li")).toHaveLength(5);
    expect(w.findAll("li[hidden]")).toHaveLength(0);
    expect(w.find("button").exists()).toBe(false);
  });

  it("collapses from six: five visible, the rest hidden but in the DOM, expand once", async () => {
    const w = mount(WordMeanings, { attachTo: document.body, props: { meanings: make(10) } });
    expect(w.findAll("li[hidden]")).toHaveLength(5);
    const more = w.find("button");
    expect(more.text()).toBe("Alle 10 Bedeutungen zeigen");
    expect(more.attributes("aria-expanded")).toBe("false");
    expect(more.attributes("aria-controls")).toBe(w.find("ol").attributes("id"));
    await more.trigger("click");
    expect(w.findAll("li[hidden]")).toHaveLength(0);
    expect(w.findAll("li")).toHaveLength(10);
    // no collapsing back: the button is gone and focus moved to the first new line
    expect(w.find("button").exists()).toBe(false);
    expect(document.activeElement?.textContent?.trim()).toBe("Bedeutung 6");
    w.unmount();
  });
});
