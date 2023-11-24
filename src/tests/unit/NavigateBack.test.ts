import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import NavigateBack from "@components/NavigateBack.vue";

describe("NavigateBack.vue", () => {
  it("calls navigateBack when button is clicked", async () => {
    const mockNavigateBack = vi.fn();
    window.history.back = mockNavigateBack;

    const wrapper = mount(NavigateBack);

    await wrapper.find("button").trigger("click");
    await nextTick();

    expect(mockNavigateBack).toHaveBeenCalled();
  });
});
