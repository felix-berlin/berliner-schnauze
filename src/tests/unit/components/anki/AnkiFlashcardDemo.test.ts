import AnkiFlashcardDemo from "@components/anki/AnkiFlashcardDemo.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

const trackEvent = vi.hoisted(() => vi.fn());
vi.mock("@utils/analytics", () => ({ trackEvent }));

const cards = [
  { example: "Ick aase rum.", href: "/wort/aasen", meaning: "verschwenden", title: "aasen" },
  { example: "", href: "/wort/alex", meaning: "Alexanderplatz", title: "Alex" },
];

describe("AnkiFlashcardDemo", () => {
  it("shows only the word until the answer is revealed", async () => {
    const wrapper = mount(AnkiFlashcardDemo, { props: { cards } });

    expect(wrapper.find(".c-anki-flashcard__word").text()).toBe("aasen");
    expect(wrapper.find(".c-anki-flashcard__answer").exists()).toBe(false);
    expect(wrapper.text()).toContain("Noch 20 heute");

    await wrapper.find(".c-anki-flashcard__foot button").trigger("click");

    expect(wrapper.find(".c-anki-flashcard__meaning").text()).toBe("verschwenden");
    expect(wrapper.find(".c-anki-flashcard__example").text()).toBe("„Ick aase rum.“");
    expect(wrapper.findAll(".c-anki-flashcard__rating")).toHaveLength(4);
  });

  it("advances to the next card after a rating and wraps around", async () => {
    const wrapper = mount(AnkiFlashcardDemo, { props: { cards } });

    const rateNext = async () => {
      await wrapper.find(".c-anki-flashcard__foot button").trigger("click");
      await wrapper.find(".c-anki-flashcard__rating--good").trigger("click");
    };

    await rateNext();
    expect(wrapper.find(".c-anki-flashcard__word").text()).toBe("Alex");
    expect(wrapper.find(".c-anki-flashcard__answer").exists()).toBe(false);
    expect(wrapper.text()).toContain("Noch 19 heute");

    await wrapper.find(".c-anki-flashcard__foot button").trigger("click");
    expect(wrapper.find(".c-anki-flashcard__example").exists()).toBe(false);
    await wrapper.find(".c-anki-flashcard__rating--again").trigger("click");

    expect(wrapper.find(".c-anki-flashcard__word").text()).toBe("aasen");
  });

  it("tracks flip and rating", async () => {
    const wrapper = mount(AnkiFlashcardDemo, { props: { cards } });

    await wrapper.find(".c-anki-flashcard__foot button").trigger("click");
    await wrapper.find(".c-anki-flashcard__rating--good").trigger("click");

    expect(trackEvent).toHaveBeenCalledWith("Anki", "Demo Flip", "anki-demo");
    expect(trackEvent).toHaveBeenCalledWith("Anki", "Demo Rate", "good");
  });
});
