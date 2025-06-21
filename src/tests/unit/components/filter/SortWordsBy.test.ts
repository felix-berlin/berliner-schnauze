import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import SortWordsBy from "@components/filter/SortWordsBy.vue";
import SortAsc from "virtual:icons/lucide/sort-asc";
import SortDesc from "virtual:icons/lucide/sort-desc";
import * as store from "@stores/index.ts";

globalThis.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ availableWordGroups: [] }),
  }),
) as any;

describe("SortWordsBy.vue", () => {
  const mockToggleFn = vi.fn();
  const mockSetActiveOrderCategory = vi.fn();
  const mockWordSearch = {
    activeOrderCategory: "date",
  };

  beforeEach(() => {
    store.$wordSearch.set(mockWordSearch);
    vi.spyOn(store, "setActiveOrderCategory").mockImplementation(mockSetActiveOrderCategory);
  });

  afterEach(() => {
    // Avoid using cleanStores due to destroy error, just reset the store manually
    store.$wordSearch.set({ activeOrderCategory: undefined });
    vi.restoreAllMocks();
    mockToggleFn.mockReset();
    mockSetActiveOrderCategory.mockReset();
  });

  it("renders correctly for ASC", () => {
    const wrapper = mount(SortWordsBy, {
      props: {
        orderCategory: "date",
        orderType: "ASC",
        toggleFn: mockToggleFn,
      },
      global: {
        components: { SortAsc, SortDesc },
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find(".c-sort-word-direction-toggle").exists()).toBe(true);
    expect(wrapper.findComponent(SortAsc).exists()).toBe(true);
    expect(wrapper.find("span").text()).toContain("aufsteigend");
    expect(wrapper.find("button").classes()).toContain("is-active");
    expect(wrapper.find("button").attributes("aria-label")).toBe("sortiere aufsteigend");
  });

  it("renders correctly for DESC", () => {
    const wrapper = mount(SortWordsBy, {
      props: {
        orderCategory: "date",
        orderType: "DESC",
        toggleFn: mockToggleFn,
      },
      global: {
        components: { SortAsc, SortDesc },
      },
    });

    expect(wrapper.findComponent(SortDesc).exists()).toBe(true);
    expect(wrapper.find("span").text()).toContain("absteigend");
    expect(wrapper.find("button").attributes("aria-label")).toBe("sortiere absteigend");
  });

  it("calls toggleFn and setActiveOrderCategory on click", async () => {
    const wrapper = mount(SortWordsBy, {
      props: {
        orderCategory: "date",
        orderType: "ASC",
        toggleFn: mockToggleFn,
      },
      global: {
        components: { SortAsc, SortDesc },
      },
    });

    await wrapper.find("button").trigger("click");

    expect(mockToggleFn).toHaveBeenCalled();
    expect(mockSetActiveOrderCategory).toHaveBeenCalledWith("date");
  });

  it("is not active if orderCategory does not match", () => {
    const wrapper = mount(SortWordsBy, {
      props: {
        orderCategory: "other",
        orderType: "ASC",
        toggleFn: mockToggleFn,
      },
      global: {
        components: { SortAsc, SortDesc },
      },
    });

    expect(wrapper.find("button").classes()).not.toContain("is-active");
  });
});
