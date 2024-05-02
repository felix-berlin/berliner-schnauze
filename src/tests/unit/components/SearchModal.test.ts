import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import SearchModal from "@components/SearchModal.vue";

describe("SearchModal", () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(SearchModal, {
      global: {
        stubs: {
          // Replace 'AsyncComponent' with the actual name of your async component
          SearchModal: true,
        },
      },
    });
  });

  it("opens modal on button click", async () => {
    await flushPromises();

    wrapper.vm.loadModal = true;

    expect(wrapper.vm.searchVisible).toBe(false);

    await wrapper.find("button").trigger("click");

    // Wait for the modal to load and open
    while (!wrapper.vm.searchVisible) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    expect(wrapper.vm.searchVisible).toBe(true);
  });

  it("renders async component when modal is open", () => {
    // Open the modal
    wrapper.vm.loadModal = true;
    wrapper.vm.searchVisible = true;

    expect(wrapper.findComponent({ name: "SearchModal" }).exists()).toBe(true);
  });
});
