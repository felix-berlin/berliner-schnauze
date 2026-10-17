import IsWordOfTheDay from "@components/word/IsWordOfTheDay.vue";
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";

vi.mock("@nanostores/vue", () => ({
  useStore: () => ({ value: { word: { berlinerisch: "test", slug: "test" } } }),
}));

describe("IsWordOfTheDay.vue", () => {
  it("renders the crown icon when isWordOfTheDay is true", async () => {
    const wrapper = mount(IsWordOfTheDay, {
      props: {
        iconSize: 24,
        tooltipPlacement: "right",
        word: "test",
        slug: "test",
      },
    });

    await nextTick();

    expect(wrapper.find(".c-is-word-of-the-day").exists()).toBe(true);
  });
});
