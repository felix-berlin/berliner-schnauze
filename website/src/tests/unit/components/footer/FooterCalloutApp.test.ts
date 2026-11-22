import FooterCalloutApp from "@components/footer/FooterCalloutApp.vue";
import { $isPwaInstalled, $showInstallButton } from "@stores/installApp.ts";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

const mountCallout = () =>
  mount(FooterCalloutApp, {
    global: { stubs: { InstallApp: { template: "<button><slot /></button>" } } },
  });

describe("FooterCalloutApp", () => {
  afterEach(() => {
    $showInstallButton.set(false);
    $isPwaInstalled.set(false);
  });

  it("renders nothing until the app can be installed", () => {
    expect(mountCallout().find("section").exists()).toBe(false);
  });

  it("shows the callout with the install button once the browser offers the prompt", async () => {
    const wrapper = mountCallout();
    $showInstallButton.set(true);
    await nextTick();
    expect(wrapper.get("h2").text()).toBe("Hol dir de Schnauze uffs Handy");
    expect(wrapper.get("button").text()).toBe("App installieren");
    expect(wrapper.get("section").attributes("aria-labelledby")).toBe(
      wrapper.get("h2").attributes("id"),
    );
  });

  it("disappears again for an already installed app", async () => {
    const wrapper = mountCallout();
    $showInstallButton.set(true);
    $isPwaInstalled.set(true);
    await nextTick();
    expect(wrapper.find("section").exists()).toBe(false);
  });
});
