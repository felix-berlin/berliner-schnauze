import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import IsWordOfTheDay from "@components/word/IsWordOfTheDay.vue";
import { nextTick } from "vue";

vi.mock("@nanostores/vue", () => ({
  useStore: () => ({ value: { word: { ID: 1, berlinerisch: "test" } } }),
}));

describe("IsWordOfTheDay.vue", () => {
  it("renders the crown icon when isWordOfTheDay is true", async () => {
    const wrapper = mount(IsWordOfTheDay, {
      props: {
        wordId: 1,
        word: "test",
        iconSize: 24,
        tooltipPlacement: "right",
      },
    });

    await nextTick();

    expect(wrapper.find(".c-word-of-the-day-crown").exists()).toBe(true);
  });
});
