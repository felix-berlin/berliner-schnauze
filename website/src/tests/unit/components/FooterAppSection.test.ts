import FooterAppSection from "@components/FooterAppSection.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { createStoreMockImpl } from "../helpers/stores";

const isPwaInstalledRef = ref(false);

vi.mock("@stores/installApp.ts", () => ({
  $isPwaInstalled: "isPwaInstalled",
}));

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(),
}));

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

import { useStore } from "@nanostores/vue";
import { trackEvent } from "@utils/analytics";
const mockedUseStore = vi.mocked(useStore);
const mockedTrackEvent = vi.mocked(trackEvent);

const mountSection = () =>
  mount(FooterAppSection, {
    global: {
      stubs: { InstallApp: true },
    },
  });

describe("FooterAppSection.vue", () => {
  beforeEach(() => {
    mockedTrackEvent.mockReset();
    isPwaInstalledRef.value = false;

    mockedUseStore.mockImplementation(createStoreMockImpl([["isPwaInstalled", isPwaInstalledRef]]));
  });

  describe("not installed", () => {
    it("renders the install heading and description", () => {
      const wrapper = mountSection();
      expect(wrapper.find("h2").text()).toBe("Installiere die App");
      expect(wrapper.text()).toContain("ob online oder offline");
    });

    it("renders the install button next to an icon-only settings link", () => {
      const wrapper = mountSection();
      expect(wrapper.findComponent({ name: "InstallApp" }).exists()).toBe(true);

      const settingsLink = wrapper.find("a[href='/settings']");
      expect(settingsLink.exists()).toBe(true);
      expect(settingsLink.attributes("aria-label")).toBe("Einstellungen");
      expect(settingsLink.classes()).toContain("c-footer-app-section__settings-link--icon-only");
      expect(settingsLink.text()).toBe("");
    });
  });

  describe("installed", () => {
    beforeEach(() => {
      isPwaInstalledRef.value = true;
    });

    it("renders the settings heading and text instead of the install prompt", () => {
      const wrapper = mountSection();
      expect(wrapper.find("h2").text()).toBe("App-Einstellungen");
      expect(wrapper.text()).toContain("Du nutzt bereits die App");
      expect(wrapper.findComponent({ name: "InstallApp" }).exists()).toBe(false);
    });

    it("renders a settings link with visible label", () => {
      const wrapper = mountSection();
      const settingsLink = wrapper.find("a[href='/settings']");
      expect(settingsLink.exists()).toBe(true);
      expect(settingsLink.text()).toContain("Einstellungen");
    });
  });

  it("tracks the settings link click", async () => {
    const wrapper = mountSection();
    await wrapper.find("a[href='/settings']").trigger("click");
    expect(mockedTrackEvent).toHaveBeenCalledWith("Footer", "click", "Open app settings");
  });
});
