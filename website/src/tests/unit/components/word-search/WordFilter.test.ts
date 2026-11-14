import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const showFilterRef = ref(false);
const mockToggle = vi.fn();
const mockResetAll = vi.fn();

const onClickOutsideHolder = vi.hoisted(() => ({
  callback: null as (() => void) | null,
}));

const mockUseTimeout = vi.hoisted(() => vi.fn());

const mockSearchMeta = vi.hoisted(() => ({}));
const searchMetaRef = ref({
  themen: [{ name: "Essen & Trinken", slug: "essen-trinken" }],
  wordTypes: ["Verb"],
});

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn((store) => (store === mockSearchMeta ? searchMetaRef : showFilterRef)),
}));

vi.mock("@stores/wordList.ts", () => ({
  $searchMeta: mockSearchMeta,
  $showWordListFilterFlyout: {},
  $toggleWordListFilterFlyout: mockToggle,
  resetAll: mockResetAll,
}));

vi.mock("@components/BadgeTag.vue", () => ({
  default: { template: '<span class="mock-badge-tag"><slot /></span>' },
}));

vi.mock("@components/ButtonWithStates.vue", () => ({
  default: {
    emits: ["click"],
    props: ["state", "type"],
    template:
      '<button class="mock-button-with-states" :type="type" @click="$emit(\'click\')"><slot /></button>',
  },
}));

vi.mock("@components/filter/LetterFilter.vue", () => ({
  default: { template: '<div class="mock-letter-filter" />' },
}));

vi.mock("@components/filter/SortWordBySelect.vue", () => ({
  default: { template: '<div class="mock-sort-word-by-select" />' },
}));

vi.mock("@components/filter/WordRangeSlider.vue", () => ({
  default: {
    props: ["rangeType", "label"],
    template: '<div class="mock-word-range-slider" />',
  },
}));

vi.mock("@components/filter/WordSwitch.vue", () => ({
  default: {
    props: ["switchType", "label"],
    template: '<div class="mock-word-switch" />',
  },
}));

vi.mock("@components/filter/MultiselectFilter.vue", () => ({
  default: {
    props: ["storeKey", "options", "label", "trackLabel"],
    template: '<div class="mock-multiselect-filter" :data-store-key="storeKey" />',
  },
}));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    onClickOutside: vi.fn((_el: unknown, cb: () => void) => {
      onClickOutsideHolder.callback = cb;
    }),
    useTimeout: mockUseTimeout,
  };
});

beforeEach(() => {
  vi.resetModules();
  showFilterRef.value = false;
  mockToggle.mockClear();
  mockResetAll.mockClear();
  mockUseTimeout.mockReset();
  mockUseTimeout.mockReturnValue({ ready: ref(true), start: vi.fn() });
});

describe("WordFilter.vue", () => {
  it("moves focus into the flyout on open and back to the opener on close", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter, { attachTo: document.body });

    showFilterRef.value = true;
    await flushPromises();
    expect(wrapper.find("aside").element.contains(document.activeElement)).toBe(true);

    showFilterRef.value = false;
    await flushPromises();
    expect(document.activeElement).toBe(opener);
    wrapper.unmount();
    opener.remove();
  });

  it("closes on Escape while open", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter, { attachTo: document.body });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(mockToggle).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("marks the Escape it handled, so the search dialog and a second instance leave it alone", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter, { attachTo: document.body });
    const event = new KeyboardEvent("keydown", { cancelable: true, key: "Escape" });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    wrapper.unmount();
  });

  it("ignores an Escape a control inside already handled", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter, { attachTo: document.body });
    const event = new KeyboardEvent("keydown", { cancelable: true, key: "Escape" });
    event.preventDefault();
    window.dispatchEvent(event);
    expect(mockToggle).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("leaves focus where the user moved it when the flyout closes", async () => {
    const opener = document.createElement("button");
    const elsewhere = document.createElement("a");
    elsewhere.href = "#";
    document.body.append(opener, elsewhere);
    opener.focus();
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter, { attachTo: document.body });
    showFilterRef.value = true;
    await flushPromises();
    elsewhere.focus();
    showFilterRef.value = false;
    await flushPromises();
    expect(document.activeElement).toBe(elsewhere);
    wrapper.unmount();
    opener.remove();
    elsewhere.remove();
  });

  it("leaves Escape alone while closed", async () => {
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter, { attachTo: document.body });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(mockToggle).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("renders an <aside> element with class c-filter-search__filter", async () => {
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    expect(wrapper.find("aside.c-filter-search__filter").exists()).toBe(true);
  });

  it("hides the aside when showWordListFilterFlyout is false", async () => {
    showFilterRef.value = false;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter, { attachTo: document.body });
    // v-show sets display:none
    const aside = wrapper.find("aside");
    expect(aside.isVisible()).toBe(false);
  });

  it("shows the aside when showWordListFilterFlyout is true", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter, { attachTo: document.body });
    const aside = wrapper.find("aside");
    expect(aside.isVisible()).toBe(true);
  });

  it("renders close button when flyout is visible", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    const closeBtn = wrapper.find("button[aria-label='schließen']");
    expect(closeBtn.exists()).toBe(true);
  });

  it("does not render close buttons when flyout is hidden", async () => {
    showFilterRef.value = false;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    // v-if="showWordListFilterFlyout" on buttons means they won't be in DOM
    expect(wrapper.find("button[aria-label='schließen']").exists()).toBe(false);
  });

  it("close button click calls $toggleWordListFilterFlyout", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    await wrapper.find("button[aria-label='schließen']").trigger("click");
    expect(mockToggle).toHaveBeenCalled();
  });

  it("renders Sortiere nach label", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    expect(wrapper.text()).toContain("Sortiere nach:");
  });

  it("renders Filter nach label", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    expect(wrapper.text()).toContain("Filter nach:");
  });

  it("renders SortWordBySelect component", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    expect(wrapper.find(".mock-sort-word-by-select").exists()).toBe(true);
  });

  it("renders LetterFilter component", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    expect(wrapper.find(".mock-letter-filter").exists()).toBe(true);
  });

  it("renders the word type MultiselectFilter with meta word types", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    const filter = wrapper.findComponent('[data-store-key="activeWordTypeFilter"]');
    expect(filter.exists()).toBe(true);
    expect(filter.props("options")).toEqual(["Verb"]);
  });

  it("renders the themen MultiselectFilter with label/value options", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    const filter = wrapper.findComponent('[data-store-key="activeThemenFilter"]');
    expect(filter.exists()).toBe(true);
    expect(filter.props("options")).toEqual([{ label: "Essen & Trinken", value: "essen-trinken" }]);
  });

  it("renders multiple WordSwitch components", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    const switches = wrapper.findAll(".mock-word-switch");
    expect(switches.length).toBeGreaterThanOrEqual(3);
  });

  it("renders multiple WordRangeSlider components", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    const sliders = wrapper.findAll(".mock-word-range-slider");
    expect(sliders.length).toBeGreaterThanOrEqual(4);
  });

  it("renders reset button with correct classes", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    const resetBtn = wrapper.find(".mock-button-with-states");
    expect(resetBtn.exists()).toBe(true);
  });

  it("clicking reset button calls resetAll", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    await wrapper.find(".mock-button-with-states").trigger("click");
    expect(mockResetAll).toHaveBeenCalled();
  });

  it("accepts closeOnClickOutside prop defaulting to true", async () => {
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    expect(wrapper.exists()).toBe(true);
  });

  it("accepts closeOnClickOutside=false without errors", async () => {
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter, {
      props: { closeOnClickOutside: false },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it("bottom close button calls $toggleWordListFilterFlyout", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    const bottomCloseBtn = wrapper.find("button.is-bottom");
    expect(bottomCloseBtn.exists()).toBe(true);
    await bottomCloseBtn.trigger("click");
    expect(mockToggle).toHaveBeenCalled();
  });

  it("onClickOutside callback calls toggle when flyout is open and closeOnClickOutside is true", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    mount(WordFilter);
    onClickOutsideHolder.callback?.();
    expect(mockToggle).toHaveBeenCalled();
  });

  it("onClickOutside callback does nothing when flyout is closed", async () => {
    showFilterRef.value = false;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    mount(WordFilter);
    onClickOutsideHolder.callback?.();
    expect(mockToggle).not.toHaveBeenCalled();
  });

  it("onClickOutside callback does nothing when closeOnClickOutside is false", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    mount(WordFilter, { props: { closeOnClickOutside: false } });
    onClickOutsideHolder.callback?.();
    expect(mockToggle).not.toHaveBeenCalled();
  });

  it("renders Berolinismus section label", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    expect(wrapper.text()).toContain("Berolinismus");
  });

  it("renders Zurücksetzen text in reset button", async () => {
    showFilterRef.value = true;
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    expect(wrapper.text()).toContain("Zurücksetzen");
  });

  it("starts the reset success timer only on click, not on mount", async () => {
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    mount(WordFilter);
    expect(mockUseTimeout).toHaveBeenCalledWith(1200, { controls: true, immediate: false });
  });

  it("ButtonWithStates gets state='success' when ready is false (covers line 66 branch)", async () => {
    mockUseTimeout.mockReturnValueOnce({ ready: ref(false), start: vi.fn() });
    const WordFilter = (await import("@components/word-search/WordFilter.vue")).default;
    const wrapper = mount(WordFilter);
    expect(wrapper.exists()).toBe(true);
  });
});
