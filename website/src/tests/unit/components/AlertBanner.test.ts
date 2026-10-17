import AlertBanner from "@components/AlertBanner.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("AlertBanner.vue", () => {
  it("renders as div by default with role=alert", () => {
    const wrapper = mount(AlertBanner);
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.attributes("role")).toBe("alert");
  });

  it("applies c-alert and c-alert--warning classes by default", () => {
    const wrapper = mount(AlertBanner);
    expect(wrapper.classes()).toContain("c-alert");
    expect(wrapper.classes()).toContain("c-alert--warning");
  });

  it("renders as a different element when element prop changes", () => {
    const wrapper = mount(AlertBanner, { props: { element: "section" } });
    expect(wrapper.element.tagName).toBe("SECTION");
  });

  it("applies custom type class", () => {
    const wrapper = mount(AlertBanner, { props: { type: "danger" } });
    expect(wrapper.classes()).toContain("c-alert--danger");
  });

  it("renders slot content", () => {
    const wrapper = mount(AlertBanner, { slots: { default: "Custom Alert Message" } });
    expect(wrapper.text()).toBe("Custom Alert Message");
  });

  it("applies custom componentClass", () => {
    const wrapper = mount(AlertBanner, { props: { componentClass: "custom-alert" } });
    expect(wrapper.classes()).toContain("custom-alert");
    expect(wrapper.classes()).toContain("custom-alert--warning");
  });
});
