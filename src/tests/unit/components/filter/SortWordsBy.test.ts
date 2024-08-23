import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import SortWordsBy from "@components/filter/SortWordsBy.vue";
import SortAsc from "virtual:icons/lucide/sort-asc";
import SortDesc from "virtual:icons/lucide/sort-desc";
import * as store from "@stores/index.ts";
import { cleanStores, keepMount } from "nanostores";

describe("SortWordsBy.vue", () => {
  const mockToggleFn = vi.fn();
  const mockWordSearch = {
    activeOrderCategory: "date",
  };

  beforeEach(() => {
    store.$wordSearch.set(mockWordSearch);
  });

  afterEach(() => {
    cleanStores(store.$wordSearch);
  });

  it("renders correctly", () => {
    keepMount(store.$wordSearch);

    const wrapper = mount(SortWordsBy, {
      props: {
        orderCategory: "date",
        orderType: "asc",
        toggleFn: mockToggleFn,
      },
      global: {
        components: {
          SortAsc,
          SortDesc,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find(".c-sort-word-direction-toggle").exists()).toBe(true);
    expect(wrapper.findComponent(SortAsc).exists()).toBe(true);
    expect(wrapper.find("span").text()).toBe("aufsteigend");
  });

  it("triggers toggleFn and setActiveOrderCategory on button click", async () => {
    keepMount(store.$wordSearch);

    const wrapper = mount(SortWordsBy, {
      props: {
        orderCategory: "date",
        orderType: "asc",
        toggleFn: mockToggleFn,
      },
      global: {
        components: {
          SortAsc,
          SortDesc,
        },
      },
    });

    const setActiveOrderCategorySpy = vi.spyOn(store, "setActiveOrderCategory");

    await wrapper.find("button").trigger("click");

    expect(mockToggleFn).toHaveBeenCalled();
    expect(setActiveOrderCategorySpy).toHaveBeenCalledWith("date");
  });

  it("applies correct classes and aria-label based on props", () => {
    keepMount(store.$wordSearch);

    const wrapper = mount(SortWordsBy, {
      props: {
        orderCategory: "date",
        orderType: "asc",
        toggleFn: mockToggleFn,
      },
      global: {
        components: {
          SortAsc,
          SortDesc,
        },
      },
    });

    expect(wrapper.find("button").classes()).toContain("is-active");
    expect(wrapper.find("button").attributes("aria-label")).toBe("sortiere aufsteigend");
  });
});
