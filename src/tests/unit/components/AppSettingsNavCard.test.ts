import AppSettingsNavCard from "@components/AppSettingsNavCard.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";

const StubIcon = defineComponent({ template: "<span />" });

describe("AppSettingsNavCard.vue", () => {
  const baseProps = {
    icon: StubIcon,
    title: "Cache verwalten",
    description: "Cache-Daten löschen",
  };

  it("renders title and description", () => {
    const wrapper = mount(AppSettingsNavCard, { props: baseProps });
    expect(wrapper.text()).toContain("Cache verwalten");
    expect(wrapper.text()).toContain("Cache-Daten löschen");
  });

  it("renders as <a> when href provided", () => {
    const wrapper = mount(AppSettingsNavCard, {
      props: { ...baseProps, href: "/settings/cache" },
    });
    expect(wrapper.element.tagName).toBe("A");
    expect(wrapper.attributes("href")).toBe("/settings/cache");
  });

  it("renders as <button> when tag=button", () => {
    const wrapper = mount(AppSettingsNavCard, {
      props: { ...baseProps, tag: "button" },
    });
    expect(wrapper.element.tagName).toBe("BUTTON");
    expect(wrapper.attributes("type")).toBe("button");
  });

  it("defaults to <button> when no href and no tag", () => {
    const wrapper = mount(AppSettingsNavCard, { props: baseProps });
    expect(wrapper.element.tagName).toBe("BUTTON");
  });

  it("applies button modifier class when rendered as button", () => {
    const wrapper = mount(AppSettingsNavCard, {
      props: { ...baseProps, tag: "button" },
    });
    expect(wrapper.classes()).toContain("c-app-settings__nav-card--button");
  });

  it("does not apply button modifier class when rendered as link", () => {
    const wrapper = mount(AppSettingsNavCard, {
      props: { ...baseProps, href: "/settings/cache" },
    });
    expect(wrapper.classes()).not.toContain("c-app-settings__nav-card--button");
  });

  it("does not bind href on button element", () => {
    const wrapper = mount(AppSettingsNavCard, {
      props: { ...baseProps, tag: "button" },
    });
    expect(wrapper.attributes("href")).toBeUndefined();
  });
});
