import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import LetterFilter from "@components/filter/LetterFilter.vue";
import { nextTick } from "vue";
import { $wordSearch, setLetterFilter } from "@stores/index.ts";
import { useStore } from "@nanostores/vue";

vi.mock("@nanostores/vue", () => ({
  useStore: () => ({
    activeLetterFilter: "",
    letterGroups: ["a", "b", "c"],
  }),
}));

vi.mock("@stores/index.ts", () => ({
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
});
