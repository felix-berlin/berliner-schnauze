import { mount } from "@vue/test-utils";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import ToastNotifyContainer from "@components/toast/ToastNotifyContainer.vue";
import ToastNotify from "@components/toast/ToastNotify.vue";
import { cleanStores, keepMount } from "nanostores";
import { $toastNotify } from "@stores/index.ts";

// Mock store data
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
    gapBetween: "5px",
    initOffset: "20px",
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
    gapBetween: "10px",
    initOffset: "25px",
  },
];

beforeEach(() => {
  // Populate the store with mock data
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
      expect(toastComponent.props("outerSpacing")).toBe(toast.outerSpacing);
      expect(toastComponent.props("gapBetween")).toBe(toast.gapBetween);
      expect(toastComponent.props("initOffset")).toBe(toast.initOffset);
    });
  });
});
