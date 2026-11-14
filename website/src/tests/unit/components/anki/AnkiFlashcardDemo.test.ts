import AnkiFlashcardDemo from "@components/anki/AnkiFlashcardDemo.vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

const trackEvent = vi.hoisted(() => vi.fn());
vi.mock("@utils/analytics", () => ({ trackEvent }));

const cards = [
  { example: "Ick aase rum.", href: "/wort/aasen", meaning: "verschwenden", title: "aasen" },
  { example: "", href: "/wort/alex", meaning: "Alexanderplatz", title: "Alex" },
];

const button = (wrapper: VueWrapper, name: string) => {
  const found = wrapper.findAll("button").find((b) => b.text().includes(name));
  if (!found) throw new Error(`no button "${name}"`);
  return found;
};
const hasButton = (wrapper: VueWrapper, name: string) =>
  wrapper.findAll("button").some((b) => b.text().includes(name));
// The demo word links to its dictionary page in the hint below the card.
const wordLink = (wrapper: VueWrapper) => wrapper.find("a").text();

describe("AnkiFlashcardDemo", () => {
  it("shows only the word until the answer is revealed", async () => {
    const wrapper = mount(AnkiFlashcardDemo, { props: { cards } });

    expect(wordLink(wrapper)).toBe("„aasen“");
    expect(wrapper.text()).not.toContain("verschwenden");
    expect(wrapper.text()).toContain("Noch 20 heute");

    await button(wrapper, "Antwort zeigen").trigger("click");

    expect(wrapper.text()).toContain("verschwenden");
    expect(wrapper.text()).toContain("„Ick aase rum.“");
    expect(wrapper.findAll("button")).toHaveLength(4);
    expect(wrapper.findAll("button").map((b) => b.text())).toEqual([
      "< 10 MinNochmal",
      "1 TagSchwer",
      "3 TageGut",
      "1 WocheEinfach",
    ]);
  });

  it("advances to the next card after a rating and wraps around", async () => {
    const wrapper = mount(AnkiFlashcardDemo, { props: { cards } });

    const rateNext = async () => {
      await button(wrapper, "Antwort zeigen").trigger("click");
      await button(wrapper, "Gut").trigger("click");
    };

    await rateNext();
    expect(wordLink(wrapper)).toBe("„Alex“");
    expect(wrapper.text()).not.toContain("Alexanderplatz");
    expect(hasButton(wrapper, "Antwort zeigen")).toBe(true);
    expect(wrapper.text()).toContain("Noch 19 heute");

    await button(wrapper, "Antwort zeigen").trigger("click");
    expect(wrapper.text()).toContain("Alexanderplatz");
    expect(wrapper.text()).not.toContain("„“");
    await button(wrapper, "Nochmal").trigger("click");

    expect(wordLink(wrapper)).toBe("„aasen“");
  });

  it("tracks flip and rating", async () => {
    const wrapper = mount(AnkiFlashcardDemo, { props: { cards } });

    await button(wrapper, "Antwort zeigen").trigger("click");
    await button(wrapper, "Gut").trigger("click");

    expect(trackEvent).toHaveBeenCalledWith("Anki", "Demo Flip", "anki-demo");
    expect(trackEvent).toHaveBeenCalledWith("Anki", "Demo Rate", "good");
  });
});
