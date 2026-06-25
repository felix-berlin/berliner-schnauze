import LetterFilter from "@components/filter/LetterFilter.vue";
import { useStore } from "@nanostores/vue";
import { $wordSearch, setLetterFilter } from "@stores/wordList.ts";
import { mount, VueWrapper } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nanostores/vue", () => ({
  useStore: () => ({
    activeLetterFilter: "",
    letterGroups: ["a", "b", "c"],
  }),
}));

vi.mock("@stores/wordList.ts", () => ({
  $wordSearch: vi.fn(),
  setLetterFilter: vi.fn(),
}));

describe("LetterFilter.vue", () => {
  let wrapper: VueWrapper<any, any>;

  beforeEach(() => {
    wrapper = mount(LetterFilter);
  });

  it("renders correctly", () => {
    expect(wrapper.element).toMatchSnapshot();
  });

  it("calls setLetterFilter when a button is clicked", async () => {
    const button = wrapper.find(".c-letter-filter__button");
    await button.trigger("click");
    expect(setLetterFilter).toHaveBeenCalled();
  });

  it("renders Alle button", () => {
    const allButton = wrapper.find(".c-letter-filter__button.is-all");
    expect(allButton.exists()).toBe(true);
    expect(allButton.text()).toBe("Alle");
  });

  it("renders one button per letter in letterGroups", () => {
    const letterButtons = wrapper.findAll(".c-letter-filter__list-item .c-letter-filter__button:not(.is-all)");
    expect(letterButtons).toHaveLength(3);
  });

  it("Alle button has is-current when activeLetterFilter is empty string", () => {
    const allButton = wrapper.find(".c-letter-filter__button.is-all");
    expect(allButton.classes()).toContain("is-current");
  });

  it("clicking Alle button calls setLetterFilter with empty string", async () => {
    const allButton = wrapper.find(".c-letter-filter__button.is-all");
    await allButton.trigger("click");
    expect(setLetterFilter).toHaveBeenCalledWith("");
  });

  it("clicking a letter button calls setLetterFilter with that letter (covers line 27)", async () => {
    const letterButtons = wrapper.findAll(".c-letter-filter__button:not(.is-all)");
    await letterButtons[0].trigger("click");
    expect(setLetterFilter).toHaveBeenCalledWith("a");
  });
});
