import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import TurnStile from "@components/TurnStile.vue";

describe("TurnStile.vue", () => {
  it("renders the component", () => {
    const wrapper = mount(TurnStile, {
      props: {
        siteKey: "testSiteKey",
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it("applies the wrapperId prop to the div", () => {
    const wrapperId = "testWrapperId";
    const wrapper = mount(TurnStile, {
      props: {
        wrapperId,
        siteKey: "testSiteKey",
      },
    });
    expect(wrapper.get(`div#${wrapperId}`).exists()).toBe(true);
  });

  it("does not create a new script tag if window.turnstile is not null", () => {
    window.turnstile = {};
    const scriptTagCountBefore = document.getElementsByTagName("script").length;
    mount(TurnStile, {
      props: {
        siteKey: "testSiteKey",
      },
    });
    const scriptTagCountAfter = document.getElementsByTagName("script").length;
    expect(scriptTagCountAfter).toBe(scriptTagCountBefore);

    window.turnstile = null;
  });
});
