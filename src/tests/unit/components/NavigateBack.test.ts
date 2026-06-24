import NavigateBack from "@components/NavigateBack.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

function mockHistory(length: number) {
  const backFn = vi.fn();
  vi.spyOn(window, "history", "get").mockReturnValue({
    length,
    back: backFn,
    forward: vi.fn(),
    go: vi.fn(),
    pushState: vi.fn(),
    replaceState: vi.fn(),
    scrollRestoration: "auto",
    state: null,
  } as unknown as History);
  return backFn;
}

describe("NavigateBack.vue", () => {
  it("does not render button when history.length is 1", async () => {
    mockHistory(1);
    const wrapper = mount(NavigateBack);
    await nextTick();
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("renders button when history.length is greater than 1", async () => {
    mockHistory(2);
    const wrapper = mount(NavigateBack);
    await nextTick();
    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("calls window.history.back() when button is clicked", async () => {
    const backFn = mockHistory(2);
    const wrapper = mount(NavigateBack);
    await nextTick();
    await wrapper.find("button").trigger("click");
    expect(backFn).toHaveBeenCalled();
  });

  it("renders slot content in button", async () => {
    mockHistory(2);
    const wrapper = mount(NavigateBack, { slots: { default: "Back" } });
    await nextTick();
    expect(wrapper.find("button").text()).toBe("Back");
  });
});
