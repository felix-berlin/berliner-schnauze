import AnkiFaq from "@components/anki/AnkiFaq.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("AnkiFaq", () => {
  it("renders one accordion item per FAQ with only the first open", () => {
    const wrapper = mount(AnkiFaq, {
      props: {
        faqs: [
          { a: "Ja.", q: "Ist Lite gratis?" },
          { a: "Mit jedem Release.", q: "Wann gibt's Updates?" },
        ],
      },
    });

    const items = wrapper.findAll("details.c-accordion__item");
    expect(items).toHaveLength(2);
    expect(items[0]?.attributes("open")).toBeDefined();
    expect(items[1]?.attributes("open")).toBeUndefined();
    expect(items[0]?.attributes("name")).toBe("anki-faq");
    expect(items[1]?.find("summary").text()).toBe("Wann gibt's Updates?");
    expect(items[1]?.find(".c-accordion__content").text()).toBe("Mit jedem Release.");
  });
});
