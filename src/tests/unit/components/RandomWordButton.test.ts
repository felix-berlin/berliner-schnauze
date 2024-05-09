import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import RandomWordButton from "@components/RandomWordButton.vue";

describe("RandomWordButton.vue", () => {
  it("renders a random word when passed", () => {
    const words = [
      { slug: "word1" /* other properties */ },
      { slug: "word2" /* other properties */ },
      // Add more words as needed
    ];

    const wrapper = mount(RandomWordButton, {
      props: { words },
    });

    // Check that the component is a Vue instance
    expect(wrapper.vm).toBeTruthy();

    // Check that the rendered href contains one of the word slugs
    const href = wrapper.find("a").attributes("href");
    expect(words.some((word) => href.includes(word.slug))).toBe(true);
  });
});
