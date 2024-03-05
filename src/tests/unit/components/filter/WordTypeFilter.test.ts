import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import WordTypeFilter from "@components/filter/WordTypeFilter.vue";
import { useStore } from "@nanostores/vue";
import { $wordSearch, setWordTypeFilter } from "@stores/index.ts";

vi.mock("@nanostores/vue", () => ({
  useStore: () => ({
    wordTypes: ["type1", "type2", "type3"],
    activeWordTypeFilter: "type1",
  }),
}));

vi.mock("@stores/index.ts", () => ({
  $wordSearch: vi.fn(),
  setWordTypeFilter: vi.fn(),
}));

describe("WordTypeFilter.vue", () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(WordTypeFilter);
  });

  it("renders the correct number of word types", () => {
    const buttons = wrapper.findAll(".c-word-type-filter__button");
    expect(buttons.length).toBe(4); // +1 for the "Alle" button
  });

  it("sets the correct word type as active", () => {
    const activeButton = wrapper.find(".is-current");
    expect(activeButton.text()).toBe("type1");
  });

  it("calls setWordTypeFilter when a button is clicked", async () => {
    const button = wrapper.find(".c-word-type-filter__button"); // Get the first button
    await button.trigger("click");
    expect(setWordTypeFilter).toHaveBeenCalled();
  });
});
