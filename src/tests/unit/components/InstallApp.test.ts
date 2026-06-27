import InstallApp from "@components/InstallApp.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createStoreMockImpl } from "../helpers/stores";

let installPromptRef = ref<unknown>(null);
let showInstallButtonRef = ref(false);
let isPwaInstalledRef = ref(false);

vi.mock("@stores/installApp.ts", () => ({
  $installPrompt: "installPrompt",
  $isPwaInstalled: "isPwaInstalled",
  $showInstallButton: "showInstallButton",
  triggerPwaInstall: vi.fn(),
}));

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(),
}));

import * as installAppStore from "@stores/installApp.ts";
import { useStore } from "@nanostores/vue";
const mockedUseStore = vi.mocked(useStore);
const mockedTriggerPwaInstall = vi.mocked(installAppStore.triggerPwaInstall);

describe("InstallApp.vue", () => {
  beforeEach(() => {
    mockedTriggerPwaInstall.mockReset();
    installPromptRef.value = null;
    showInstallButtonRef.value = false;
    isPwaInstalledRef.value = false;

    mockedUseStore.mockImplementation(
      createStoreMockImpl([
        ["installPrompt", installPromptRef],
        ["showInstallButton", showInstallButtonRef],
        ["isPwaInstalled", isPwaInstalledRef],
      ]),
    );
  });

  it("button is hidden when hideIfInstalled=true and isPwaInstalled=true", () => {
    isPwaInstalledRef.value = true;
    const wrapper = mount(InstallApp, { props: { hideIfInstalled: true } });
    // v-show="hideIfInstalled && !isPwaInstalled" → true && false → hidden
    expect(wrapper.find("button").isVisible()).toBe(false);
  });

  it("button is visible when hideIfInstalled=true and isPwaInstalled=false", () => {
    isPwaInstalledRef.value = false;
    const wrapper = mount(InstallApp, { props: { hideIfInstalled: true } });
    // v-show="true && !false" → visible
    expect(wrapper.find("button").isVisible()).toBe(true);
  });

  it("button is hidden when hideIfInstalled=false", () => {
    isPwaInstalledRef.value = false;
    const wrapper = mount(InstallApp, { props: { hideIfInstalled: false } });
    // v-show="false && ..." → always hidden
    expect(wrapper.find("button").isVisible()).toBe(false);
  });

  it("renders default slot when showText=true", () => {
    const wrapper = mount(InstallApp, {
      props: { showText: true },
      slots: { default: "<span>Install Now</span>" },
    });
    expect(wrapper.html()).toContain("Install Now");
  });

  it("does not render default slot when showText=false", () => {
    const wrapper = mount(InstallApp, {
      props: { showText: false },
      slots: { default: "<span>Install Now</span>" },
    });
    expect(wrapper.html()).not.toContain("Install Now");
  });

  it("shows installed slot when isPwaInstalled=true", () => {
    isPwaInstalledRef.value = true;
    const wrapper = mount(InstallApp, {
      slots: { installed: "<div class='installed-msg'>Already installed!</div>" },
    });
    expect(wrapper.find(".installed-msg").exists()).toBe(true);
  });

  it("does not show installed slot when isPwaInstalled=false", () => {
    isPwaInstalledRef.value = false;
    const wrapper = mount(InstallApp, {
      slots: { installed: "<div class='installed-msg'>Already installed!</div>" },
    });
    expect(wrapper.find(".installed-msg").exists()).toBe(false);
  });

  it("button is disabled when showButton is false", () => {
    showInstallButtonRef.value = false;
    const wrapper = mount(InstallApp, {});
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
  });

  it("button is not disabled when showButton is true", () => {
    showInstallButtonRef.value = true;
    const wrapper = mount(InstallApp, {});
    expect(wrapper.find("button").attributes("disabled")).toBeUndefined();
  });

  it("calls triggerPwaInstall when button is clicked", async () => {
    showInstallButtonRef.value = true;
    const wrapper = mount(InstallApp, {});
    await wrapper.find("button").trigger("click");
    expect(mockedTriggerPwaInstall).toHaveBeenCalledOnce();
  });
});
