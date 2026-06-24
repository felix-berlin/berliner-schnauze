import AlphabeticalFilterDropdown from "@components/filter/AlphabeticalFilterDropdown.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";

vi.mock("virtual:icons/lucide/filter", async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, default: { template: "<span data-testid='filter-icon' />" } };
});

vi.mock("virtual:icons/lucide/x", async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, default: { template: "<span data-testid='x-icon' />" } };
});

const { mockSetLetterFilter, mockDropdownClose, onSetHolder } = vi.hoisted(() => ({
  mockSetLetterFilter: vi.fn(),
  mockDropdownClose: vi.fn(),
  onSetHolder: { callback: null as ((arg: { newValue: unknown }) => void) | null },
}));

const mockWordSearch = ref({ activeLetterFilter: "", search: "" });

vi.mock("@stores/wordList.ts", () => ({
  $wordSearch: {},
  setLetterFilter: mockSetLetterFilter,
}));

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => mockWordSearch),
}));

vi.mock("nanostores", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    onSet: vi.fn((_store: unknown, cb: (arg: { newValue: unknown }) => void) => {
      onSetHolder.callback = cb;
    }),
  };
});

vi.mock("@components/DropdownPopover.vue", () => ({
  default: {
    name: "DropdownPopover",
    template: `<div class="mock-dropdown" :class="$attrs.class"><slot :triggerProps="{}" /><slot name="panel" /></div>`,
    inheritAttrs: false,
    expose: ["close"],
    setup: () => ({ close: mockDropdownClose }),
  },
}));

vi.mock("@components/filter/LetterFilter.vue", () => ({
  default: { template: "<div class='mock-letter-filter' />" },
}));

describe("AlphabeticalFilterDropdown.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDropdownClose.mockClear();
    mockWordSearch.value = { activeLetterFilter: "", search: "" };
    onSetHolder.callback = null;
  });

  it("renders .c-filter-dropdown", () => {
    const wrapper = mount(AlphabeticalFilterDropdown);
    expect(wrapper.find(".c-filter-dropdown").exists()).toBe(true);
  });

  it("renders button with 'alphabetisch' text", () => {
    const wrapper = mount(AlphabeticalFilterDropdown);
    expect(wrapper.text()).toContain("alphabetisch");
  });

  it("does not show active filter button when activeLetterFilter is empty", () => {
    const wrapper = mount(AlphabeticalFilterDropdown);
    expect(wrapper.find(".c-filter-dropdown__active-filter").exists()).toBe(false);
  });

  it("shows active filter button when activeLetterFilter is set", () => {
    mockWordSearch.value = { activeLetterFilter: "B", search: "" };
    const wrapper = mount(AlphabeticalFilterDropdown);
    expect(wrapper.find(".c-filter-dropdown__active-filter").exists()).toBe(true);
  });

  it("displays the active letter in the filter button", () => {
    mockWordSearch.value = { activeLetterFilter: "K", search: "" };
    const wrapper = mount(AlphabeticalFilterDropdown);
    expect(wrapper.find(".c-filter-dropdown__active-filter span").text()).toBe("K");
  });

  it("calls setLetterFilter('') when active filter button is clicked", async () => {
    mockWordSearch.value = { activeLetterFilter: "A", search: "" };
    const wrapper = mount(AlphabeticalFilterDropdown);
    await wrapper.find(".c-filter-dropdown__active-filter").trigger("click");
    expect(mockSetLetterFilter).toHaveBeenCalledWith("");
  });

  it("renders LetterFilter inside panel slot", () => {
    const wrapper = mount(AlphabeticalFilterDropdown);
    expect(wrapper.find(".mock-letter-filter").exists()).toBe(true);
  });

  it("renders filter icon", () => {
    const wrapper = mount(AlphabeticalFilterDropdown);
    expect(wrapper.find("[data-testid='filter-icon']").exists()).toBe(true);
  });

  it("shows x-icon in active filter button", () => {
    mockWordSearch.value = { activeLetterFilter: "Z", search: "" };
    const wrapper = mount(AlphabeticalFilterDropdown);
    expect(wrapper.find("[data-testid='x-icon']").exists()).toBe(true);
  });

  it("onSet callback closes dropdown when activeLetterFilter changes", () => {
    mockWordSearch.value = { activeLetterFilter: "A", search: "" };
    mount(AlphabeticalFilterDropdown);
    onSetHolder.callback?.({ newValue: { activeLetterFilter: "B" } });
    expect(mockDropdownClose).toHaveBeenCalled();
  });

  it("onSet callback does not close dropdown when activeLetterFilter is unchanged", () => {
    mockWordSearch.value = { activeLetterFilter: "A", search: "" };
    mount(AlphabeticalFilterDropdown);
    onSetHolder.callback?.({ newValue: { activeLetterFilter: "A" } });
    expect(mockDropdownClose).not.toHaveBeenCalled();
  });
});
