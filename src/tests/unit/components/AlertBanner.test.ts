import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import AlertBanner from "@components/AlertBanner.vue";

describe("AlertBanner.vue", () => {
  it("renders with default props", () => {
    const wrapper = mount(AlertBanner);
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.classes()).toContain("c-alert");
    expect(wrapper.classes()).toContain("c-alert--warning");
    expect(wrapper.text()).toBe("Alert");
  });

  it("renders with different type props", () => {
    const types = ["success", "danger", "info"];
    types.forEach((type) => {
      const wrapper = mount(AlertBanner, {
        props: { type },
      });
      expect(wrapper.classes()).toContain(`c-alert--${type}`);
    });
  });

  it("renders with a custom element", () => {
    const wrapper = mount(AlertBanner, {
      props: { element: "span" },
    });
    expect(wrapper.element.tagName).toBe("SPAN");
  });

  it("renders with a custom componentClass", () => {
    const wrapper = mount(AlertBanner, {
      props: { componentClass: "custom-alert" },
    });
    expect(wrapper.classes()).toContain("custom-alert");
    expect(wrapper.classes()).toContain("custom-alert--warning");
  });

  it("renders slot content correctly", () => {
    const wrapper = mount(AlertBanner, {
      slots: { default: "Custom Alert Message" },
    });
    expect(wrapper.text()).toBe("Custom Alert Message");
  });
});
