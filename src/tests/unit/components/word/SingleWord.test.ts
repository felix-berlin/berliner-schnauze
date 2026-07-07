import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@utils/helpers.ts", () => ({
  routeToWord: vi.fn((slug: string) => `/wort/${slug}`),
  randomElement: vi.fn(),
}));

vi.mock("@components/word/WordOptionDropdown.vue", () => ({
  __esModule: true,
  default: {
    name: "WordOptionDropdown",
    template: '<div class="mock-word-option-dropdown"><slot name="after" /></div>',
  },
}));

const source = {
  berlinerWordId: "42",
  slug: "schnauze",
  wordGroup: "noun",
  wordProperties: {
    berlinerisch: "Schnauze",
    translations: ["Mund", "Gesicht"],
  },
};

beforeEach(() => {
  vi.resetModules();
});

describe("SingleWord.vue", () => {
  it("renders article with id word-{berlinerWordId}", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const wrapper = mount(SingleWord, {
      props: { source, showDropdown: false },
    });
    expect(wrapper.find("article#word-42").exists()).toBe(true);
  });

  it("sets data-group attribute from wordGroup", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const wrapper = mount(SingleWord, {
      props: { source, showDropdown: false },
    });
    expect(wrapper.find("article").attributes("data-group")).toBe("noun");
  });

  it("renders .c-word-list__berlinerisch element", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const wrapper = mount(SingleWord, {
      props: { source, showDropdown: false },
    });
    expect(wrapper.find(".c-word-list__berlinerisch").exists()).toBe(true);
  });

  it("link inside .c-word-list__berlinerisch points to routeToWord(slug)", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const wrapper = mount(SingleWord, {
      props: { source, showDropdown: false },
    });
    const link = wrapper.find(".c-word-list__berlinerisch a");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("/wort/schnauze");
  });

  it("renders translations in .c-word-list__translation", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const wrapper = mount(SingleWord, {
      props: { source, showDropdown: false },
    });
    const translation = wrapper.find(".c-word-list__translation");
    expect(translation.exists()).toBe(true);
    expect(translation.html()).toContain("Mund");
    expect(translation.html()).toContain("Gesicht");
  });

  it("has has-translation class when translations exist", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const wrapper = mount(SingleWord, {
      props: { source, showDropdown: false },
    });
    expect(wrapper.find("article").classes()).toContain("has-translation");
  });

  it("does not have has-translation class when translations is absent", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const sourceNoTranslation = {
      ...source,
      wordProperties: { berlinerisch: "Schnauze" },
    };
    const wrapper = mount(SingleWord, {
      props: { source: sourceNoTranslation, showDropdown: false },
    });
    expect(wrapper.find("article").classes()).not.toContain("has-translation");
  });

  it("renders berlinerisch text in the link", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const wrapper = mount(SingleWord, {
      props: { source, showDropdown: false },
    });
    const link = wrapper.find(".c-word-list__berlinerisch a");
    expect(link.html()).toContain("Schnauze");
  });

  it("wraps matched text in <mark class=\"is-highlight\"> when highlightTerm matches", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const wrapper = mount(SingleWord, {
      props: { highlightTerm: "Schna", source, showDropdown: false },
    });
    const link = wrapper.find(".c-word-list__berlinerisch a");
    expect(link.html()).toContain('<mark class="is-highlight">Schna</mark>');
    expect(link.html()).toContain("uze");
  });

  it("renders plain text when no highlightTerm provided", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const wrapper = mount(SingleWord, {
      props: { source, showDropdown: false },
    });
    const link = wrapper.find(".c-word-list__berlinerisch a");
    expect(link.html()).not.toContain("<mark");
    expect(link.html()).toContain("Schnauze");
  });

  it("uses empty string fallback when berlinerisch is undefined (covers ?? '' branch)", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const sourceNoBerlinerisch = {
      ...source,
      wordProperties: { berlinerisch: undefined as unknown as string },
    };
    const wrapper = mount(SingleWord, {
      props: { source: sourceNoBerlinerisch, showDropdown: false },
    });
    const link = wrapper.find(".c-word-list__berlinerisch a");
    expect(link.html()).not.toContain("<mark");
  });

  it("returns plain text when highlightTerm is whitespace only", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const wrapper = mount(SingleWord, {
      props: { highlightTerm: "   ", source, showDropdown: false },
    });
    const link = wrapper.find(".c-word-list__berlinerisch a");
    expect(link.html()).not.toContain("<mark");
    expect(link.html()).toContain("Schnauze");
  });

  it("returns plain text when highlightTerm does not match", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const wrapper = mount(SingleWord, {
      props: { highlightTerm: "xyz", source, showDropdown: false },
    });
    const link = wrapper.find(".c-word-list__berlinerisch a");
    expect(link.html()).not.toContain("<mark");
    expect(link.html()).toContain("Schnauze");
  });

  it("highlights case-insensitively", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const wrapper = mount(SingleWord, {
      props: { highlightTerm: "schna", source, showDropdown: false },
    });
    const link = wrapper.find(".c-word-list__berlinerisch a");
    expect(link.html()).toContain('<mark class="is-highlight">Schna</mark>');
  });

  it("renders WordOptionDropdown when showDropdown is true", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const wrapper = mount(SingleWord, {
      props: { source, showDropdown: true },
    });
    await flushPromises();
    expect(wrapper.find(".mock-word-option-dropdown").exists()).toBe(true);
  });

  it("renders 'Mehr erfahren' link inside dropdown #after slot when showDropdown is true", async () => {
    const SingleWord = (await import("@components/word/SingleWord.vue")).default;
    const wrapper = mount(SingleWord, {
      props: { source, showDropdown: true },
    });
    await flushPromises();
    const link = wrapper.find(".c-options-dropdown__copy-button");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("/wort/schnauze");
    expect(link.text()).toContain("Mehr erfahren");
  });
});
