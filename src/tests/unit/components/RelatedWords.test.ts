import RelatedWords from "@components/RelatedWords.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@utils/helpers.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/helpers.ts")>()),
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
    const wrapper = mount(RelatedWords, { props: { numberOfWords: 3, words } });
    expect(wrapper.findAll("li")).toHaveLength(3);
  });

  it("renders links with correct href from routeToWord", () => {
    const wrapper = mount(RelatedWords, { props: { numberOfWords: 1, words } });
    const link = wrapper.find("a");
    expect(link.attributes("href")).toMatch(/^\/wort\//);
  });

  it("shows the berlinerisch text in each link", () => {
    const simpleWords = [
      makeWord("allet", "Allet"),
      makeWord("kiez", "Kiez"),
      makeWord("schnauze", "Schnauze"),
    ];
    const wrapper = mount(RelatedWords, { props: { numberOfWords: 3, words: simpleWords } });
    const linkTexts = wrapper.findAll("a").map((a) => a.text());
    expect(linkTexts.some((t) => ["Allet", "Kiez", "Schnauze"].includes(t))).toBe(true);
  });

  it("links have title attribute with berlinerisch text", () => {
    const wrapper = mount(RelatedWords, { props: { numberOfWords: 1, words } });
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

  it("renders all words when numberOfWords exceeds available words", () => {
    const tooFew = [makeWord("a", "A"), makeWord("b", "B")];
    const wrapper = mount(RelatedWords, { props: { numberOfWords: 5, words: tooFew } });
    expect(wrapper.findAll("a.c-related-words__word")).toHaveLength(2);
  });

  it("uses slug as key when id is undefined", () => {
    const wordsWithoutId = [
      { slug: "allet", wordProperties: { berlinerisch: "Allet" } },
      { slug: "kiez", wordProperties: { berlinerisch: "Kiez" } },
      { slug: "schnauze", wordProperties: { berlinerisch: "Schnauze" } },
    ] as ReturnType<typeof makeWord>[];
    const wrapper = mount(RelatedWords, { props: { numberOfWords: 3, words: wordsWithoutId } });
    expect(wrapper.findAll("li")).toHaveLength(3);
  });

  it("falls back to empty string key when both id and slug are undefined", () => {
    const wordsWithoutIdOrSlug = [
      { wordProperties: { berlinerisch: "Allet" } },
      { wordProperties: { berlinerisch: "Kiez" } },
      { wordProperties: { berlinerisch: "Schnauze" } },
    ] as unknown as ReturnType<typeof makeWord>[];
    const wrapper = mount(RelatedWords, {
      props: { numberOfWords: 3, words: wordsWithoutIdOrSlug },
    });
    expect(wrapper.findAll("li")).toHaveLength(3);
  });
});
