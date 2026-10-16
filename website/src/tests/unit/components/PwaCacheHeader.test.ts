import PwaCacheHeader from "@components/PwaCacheHeader.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("PwaCacheHeader", () => {
  it("renders title", () => {
    const wrapper = mount(PwaCacheHeader, { props: { onlineStatus: "online" } });
    expect(wrapper.find("h1").text()).toBe("Offline-Cache");
  });

  it("shows online label and is-online class when online", () => {
    const wrapper = mount(PwaCacheHeader, { props: { onlineStatus: "online" } });
    const status = wrapper.find(".c-pwa-cache__status");
    expect(status.text()).toContain("Online");
    expect(status.classes()).toContain("is-online");
    expect(status.classes()).not.toContain("is-offline");
  });

  it("shows offline label and is-offline class when offline", () => {
    const wrapper = mount(PwaCacheHeader, { props: { onlineStatus: "offline" } });
    const status = wrapper.find(".c-pwa-cache__status");
    expect(status.text()).toContain("Offline");
    expect(status.classes()).toContain("is-offline");
    expect(status.classes()).not.toContain("is-online");
  });
});
