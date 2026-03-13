import NavigateBack from "@components/NavigateBack.vue";
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";

describe("NavigateBack.vue", () => {
  it("calls navigateBack when button is clicked", async () => {
    // Mock window.history.length and window.history.back
    const originalHistoryLength = window.history.length;
    const originalHistoryBack = window.history.back;

    Object.defineProperty(window.history, "length", {
      value: 2,
      writable: true,
    });
    window.history.back = vi.fn();

    const wrapper = mount(NavigateBack);

    await nextTick();

    await wrapper.find("button").trigger("click");

    expect(window.history.back).toHaveBeenCalled();

    // Restore original window.history.length and window.history.back
    Object.defineProperty(window.history, "length", {
      value: originalHistoryLength,
      writable: true,
    });
    window.history.back = originalHistoryBack;
  });
});
