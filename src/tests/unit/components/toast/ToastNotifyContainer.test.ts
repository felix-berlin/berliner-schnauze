import ToastNotify from "@components/toast/ToastNotify.vue";
import ToastNotifyContainer from "@components/toast/ToastNotifyContainer.vue";
import { $toastNotify } from "@stores/index.ts";
import { mount } from "@vue/test-utils";
import { cleanStores, keepMount } from "nanostores";
import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from "vitest";

vi.mock("@stores/toastNotify.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stores/toastNotify.ts")>();
  return { ...actual, removeToastById: vi.fn() };
});

beforeAll(() => {
  window.HTMLElement.prototype.showPopover = vi.fn();
});

const mockToasts = [
  {
    id: 1,
    status: "success",
    message: "Toast message 1",
    showStatusIcon: true,
    position: "top-right",
    showClose: true,
    closeOnSwipe: true,
    outerSpacing: "10px",
    gapBetween: 5,
    initOffset: 20,
  },
  {
    id: 2,
    status: "error",
    message: "Toast message 2",
    showStatusIcon: false,
    position: "bottom-left",
    showClose: false,
    closeOnSwipe: false,
    outerSpacing: "15px",
    gapBetween: 10,
    initOffset: 25,
  },
];

beforeEach(() => {
  $toastNotify.set(mockToasts);
});

afterEach(() => {
  cleanStores($toastNotify);
});

describe("ToastNotifyContainer.vue", () => {
  it("renders ToastNotify components based on the store data", () => {
    keepMount($toastNotify);

    const wrapper = mount(ToastNotifyContainer);
    const toastComponents = wrapper.findAllComponents(ToastNotify);

    expect(toastComponents).toHaveLength(mockToasts.length);

    mockToasts.forEach((toast, index) => {
      const toastComponent = toastComponents[index];
      expect(toastComponent.props("id")).toBe(toast.id);
      expect(toastComponent.props("status")).toBe(toast.status);
      expect(toastComponent.props("message")).toBe(toast.message);
      expect(toastComponent.props("showStatusIcon")).toBe(toast.showStatusIcon);
      expect(toastComponent.props("position")).toBe(toast.position);
      expect(toastComponent.props("showClose")).toBe(toast.showClose);
      expect(toastComponent.props("closeOnSwipe")).toBe(toast.closeOnSwipe);
    });
  });

  it("computes anchor chain per position group", () => {
    keepMount($toastNotify);
    const wrapper = mount(ToastNotifyContainer);
    const toastComponents = wrapper.findAllComponents(ToastNotify);

    // toast id=1 is first in top-right → anchors to corner
    expect(toastComponents[0].props("anchorSource")).toBe("--toast-corner-top-right");
    expect(toastComponents[0].props("anchorName")).toBe("--toast-1");

    // toast id=2 is first in bottom-left → anchors to its own corner
    expect(toastComponents[1].props("anchorSource")).toBe("--toast-corner-bottom-left");
    expect(toastComponents[1].props("anchorName")).toBe("--toast-2");
  });
});
