import LetterFilter from "@components/filter/LetterFilter.vue";
import { setLetterFilter } from "@stores/wordList.ts";
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nanostores/vue", () => ({
  useStore: () => ({
    activeLetterFilter: "",
    letterGroups: ["a", "b", "c"],
  }),
}));

vi.mock("@stores/wordList.ts", () => ({
  $searchMeta: vi.fn(),
  $wordSearch: vi.fn(),
  setLetterFilter: vi.fn(),
}));

describe("LetterFilter.vue", () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    wrapper = mount(LetterFilter);
  });

  it("renders correctly", () => {
    expect(wrapper.element).toMatchSnapshot();
  });

  it("calls setLetterFilter when a button is clicked", async () => {
    const button = wrapper.find(".c-letter-filter button");
    await button.trigger("click");
    expect(setLetterFilter).toHaveBeenCalled();
  });

  it("renders Alle button", () => {
    const allButton = wrapper.find('.c-letter-filter [data-kind="all"] button');
    expect(allButton.exists()).toBe(true);
    expect(allButton.text()).toBe("Alle");
  });

  it("renders one button per letter in letterGroups", () => {
    const letterButtons = wrapper.findAll(
      '.c-letter-filter .list-item:not([data-kind="all"]) button',
    );
    expect(letterButtons).toHaveLength(3);
  });

  it("Alle button is pressed when activeLetterFilter is empty string", () => {
    const allButton = wrapper.find('.c-letter-filter [data-kind="all"] button');
    expect(allButton.attributes("aria-pressed")).toBe("true");
  });

  it("clicking Alle button calls setLetterFilter with empty string", async () => {
    const allButton = wrapper.find('.c-letter-filter [data-kind="all"] button');
    await allButton.trigger("click");
    expect(setLetterFilter).toHaveBeenCalledWith("");
  });

  it("clicking a letter button calls setLetterFilter with that letter (covers line 27)", async () => {
    const letterButtons = wrapper.findAll(
      '.c-letter-filter .list-item:not([data-kind="all"]) button',
    );
    await letterButtons[0].trigger("click");
    expect(setLetterFilter).toHaveBeenCalledWith("a");
  });
});
