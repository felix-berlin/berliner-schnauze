import RelatedWords from "@components/RelatedWords.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@utils/helpers.ts", () => ({
  routeToWord: vi.fn((slug: string) => `/wort/${slug}`),
}));

const makeWord = (slug: string, berlinerisch: string) => ({
  id: slug,
  slug,
  wordProperties: { berlinerisch },
});

describe("RelatedWords.vue", () => {
  const words = [
    makeWord("allet", "Allet"),
    makeWord("kiez", "Kiez"),
    makeWord("schnauze", "Schnauze"),
    makeWord("berliner", "Berliner"),
    makeWord("molle", "Molle"),
    makeWord("icke", "Icke"),
    makeWord("jut", "Jut"),
    makeWord("nüscht", "Nüscht"),
  ];

  it("renders the correct number of words (default 7)", () => {
    const wrapper = mount(RelatedWords, { props: { words } });
    expect(wrapper.findAll("li")).toHaveLength(7);
  });

  it("renders the specified numberOfWords", () => {
    const wrapper = mount(RelatedWords, { props: { words, numberOfWords: 3 } });
    expect(wrapper.findAll("li")).toHaveLength(3);
  });

  it("renders links with correct href from routeToWord", () => {
    const wrapper = mount(RelatedWords, { props: { words, numberOfWords: 1 } });
    const link = wrapper.find("a");
    expect(link.attributes("href")).toMatch(/^\/wort\//);
  });

  it("shows the berlinerisch text in each link", () => {
    const simpleWords = [
      makeWord("allet", "Allet"),
      makeWord("kiez", "Kiez"),
      makeWord("schnauze", "Schnauze"),
    ];
    const wrapper = mount(RelatedWords, { props: { words: simpleWords, numberOfWords: 3 } });
    const linkTexts = wrapper.findAll("a").map((a) => a.text());
    expect(linkTexts.some((t) => ["Allet", "Kiez", "Schnauze"].includes(t))).toBe(true);
  });

  it("links have title attribute with berlinerisch text", () => {
    const wrapper = mount(RelatedWords, { props: { words, numberOfWords: 1 } });
    const link = wrapper.find("a");
    expect(link.attributes("title")).toMatch(/Erfahre mehr über/);
  });

  it("renders the section with correct class", () => {
    const wrapper = mount(RelatedWords, { props: { words } });
    expect(wrapper.find(".c-related-words").exists()).toBe(true);
  });

  it("renders headline text", () => {
    const wrapper = mount(RelatedWords, { props: { words } });
    expect(wrapper.find("h2").text()).toBe("Bock mehr Wörter kennen zu lernen?");
  });
});
