import ToastNotifyContainer from "@components/toast/ToastNotifyContainer.vue";
import ToastPositionGroup from "@components/toast/ToastPositionGroup.vue";
import { $toastNotify } from "@stores/toastNotify.ts";
import { mount } from "@vue/test-utils";
import { cleanStores } from "nanostores";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@components/toast/ToastPositionGroup.vue", () => ({
  default: {
    props: ["position", "toasts"],
    template: '<div class="c-toast-position-group" :data-position="position" />',
  },
}));

beforeEach(() => {
  $toastNotify.set([]);
});
afterEach(() => {
  cleanStores($toastNotify);
});

describe("ToastNotifyContainer.vue", () => {
  it("always renders exactly 6 ToastPositionGroup components", () => {
    const wrapper = mount(ToastNotifyContainer);
    expect(wrapper.findAllComponents(ToastPositionGroup)).toHaveLength(6);
  });

  it("renders one group per position including all 6 positions", () => {
    const wrapper = mount(ToastNotifyContainer);
    const positions = wrapper
      .findAllComponents(ToastPositionGroup)
      .map((c) => c.props("position"));
    expect(positions).toContain("top-left");
    expect(positions).toContain("top-center");
    expect(positions).toContain("top-right");
    expect(positions).toContain("bottom-left");
    expect(positions).toContain("bottom-center");
    expect(positions).toContain("bottom-right");
  });

  it("passes only matching toasts to each position group", async () => {
    $toastNotify.set([
      { id: "a", message: "A", position: "top-right" },
      { id: "b", message: "B", position: "top-right" },
      { id: "c", message: "C", position: "bottom-left" },
    ]);
    const wrapper = mount(ToastNotifyContainer);
    await import("vue").then((v) => v.nextTick());

    const groups = wrapper.findAllComponents(ToastPositionGroup);
    const topRight = groups.find((g) => g.props("position") === "top-right");
    const bottomLeft = groups.find((g) => g.props("position") === "bottom-left");
    const topLeft = groups.find((g) => g.props("position") === "top-left");

    expect(topRight!.props("toasts")).toHaveLength(2);
    expect(bottomLeft!.props("toasts")).toHaveLength(1);
    expect(topLeft!.props("toasts")).toHaveLength(0);
  });

  it("routes toast with no position to top-right via ?? fallback", async () => {
    $toastNotify.set([{ id: "x", message: "X" }]);
    const wrapper = mount(ToastNotifyContainer);
    await import("vue").then((v) => v.nextTick());
    const groups = wrapper.findAllComponents(ToastPositionGroup);
    const topRight = groups.find((g) => g.props("position") === "top-right");
    expect(topRight!.props("toasts")).toHaveLength(1);
  });
});
