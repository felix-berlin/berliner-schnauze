import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SearchModal from "@components/SearchModal.vue";

describe("SearchModal", () => {
  it("opens modal on button click", async () => {
    const wrapper = mount(SearchModal);

    expect(wrapper.vm.searchVisible).toBe(false);

    await wrapper.find("button").trigger("click");

    expect(wrapper.vm.searchVisible).toBe(true);
  });

  it("closes modal on modal close event", async () => {
    const wrapper = mount(SearchModal);

    await wrapper.find("button").trigger("click");
    expect(wrapper.vm.searchVisible).toBe(true);

    await wrapper.findComponent({ name: "Modal" }).vm.$emit("close");

    expect(wrapper.vm.searchVisible).toBe(false);
  });

  it("searchModal ref is defined after component is mounted", async () => {
    const wrapper = mount(SearchModal);

    await wrapper.vm.$nextTick();

    expect(wrapper.vm.searchModal).not.toBeNull();
  });

  // it('opens search on "/" or "." key press', async () => {
  //   const openSearchMock = vi.fn();
  //   const focusSearchMock = vi.fn();

  //   const MockedSearchModal = {
  //     ...SearchModal,
  //     methods: {
  //       openSearch: openSearchMock,
  //       focusSearch: focusSearchMock,
  //     },
  //   };

  //   const wrapper = mount(MockedSearchModal);

  //   const event = new KeyboardEvent("keydown", { key: "/" });
  //   window.dispatchEvent(event);

  //   await wrapper.vm.$nextTick();

  //   expect(openSearchMock).toHaveBeenCalled();
  //   expect(focusSearchMock).toHaveBeenCalled();
  // });

  it("does not open search when input or textarea is focused", async () => {
    const openSearchMock = vi.fn();
    const focusSearchMock = vi.fn();

    const wrapper = mount(SearchModal, {
      methods: {
        openSearch: openSearchMock,
        focusSearch: focusSearchMock,
      },
    });

    // Simulate focus on an input element
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent("keydown", { key: "/" });
    window.dispatchEvent(event);

    await wrapper.vm.$nextTick();

    expect(openSearchMock).not.toHaveBeenCalled();
    expect(focusSearchMock).not.toHaveBeenCalled();
  });
});
