import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import WordSuggestHint from "/home/felix/workspace/berliner-schnauze/src/components/WordSuggestHint.vue";

vi.mock("@nanostores/vue", () => ({
  useStore: () => ({
    wordSearch: {
      letterGroups: [],
      activeLetterFilter: "",
      wordTypes: [],
      activeWordTypeFilter: "",
      wordList: [],
      search: "",
      alphabeticalOrder: "asc",
      dateOrder: "asc",
      modifiedDateOrder: "asc",
      activeOrderCategory: "alphabetical",
      berolinismus: false,
    },
  }),
}));

vi.mock("@stores/index.ts", () => ({
  $wordSearch: vi.fn(),
}));

vi.mock("@components/Modal.vue", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("@components/Modal.vue")>();
  return {
    __esModule: true, // This line is important for Vitest to understand it's an ES module mock
    __isTeleport: true, // Add the missing export
    default: {
      name: "Modal",
      template: "<div></div>",
      // You can spread other properties from the original module if needed
      ...originalModule,
    },
  };
});

vi.mock("@components/SuggestWordForm.vue", () => ({
  name: "SuggestWordForm",
  template: "<div></div>",
}));

describe("WordSuggestHint.vue", {}, () => {
  it("renders without errors", () => {
    const wrapper = mount(WordSuggestHint);
    expect(wrapper.exists()).toBe(true);
  });

  it("initially does not show the modal", () => {
    const wrapper = mount(WordSuggestHint);
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("attempts to load and show the modal when button is clicked", async () => {
    const wrapper = mount(WordSuggestHint);
    await wrapper.find("button").trigger("click");
    // Since modal loading is asynchronous and involves retries, you might need to mock or wait
    expect(wrapper.vm.loadModal).toBe(true);
    // Further assertions can be made depending on the mock implementation of the modal loading logic
  });
});
