import InstallApp from "@components/InstallApp.vue";
import * as installStore from "@stores/index.ts";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@stores/index.ts", async () => {
  const { atom } = await import("nanostores");

  return {
    $installPrompt: atom(null),
    $isPwaInstalled: atom(false),
    $showInstallButton: atom(false),
    triggerPwaInstall: vi.fn(),
  };
});

describe("InstallApp.vue", () => {
  beforeEach(() => {
    installStore.$isPwaInstalled.set(false);
    installStore.$showInstallButton.set(false);
    vi.clearAllMocks();
  });

  it("renders disabled install button when no prompt is available", () => {
    const wrapper = mount(InstallApp);
    const button = wrapper.get("button");

    expect(button.exists()).toBe(true);
    expect(button.attributes("disabled")).toBeDefined();
  });

  it("triggers install prompt when button is enabled", async () => {
    installStore.$showInstallButton.set(true);

    const wrapper = mount(InstallApp);

    await wrapper.get("button").trigger("click");

    expect(vi.mocked(installStore.triggerPwaInstall)).toHaveBeenCalledTimes(1);
  });

  it("renders installed slot content when PWA is installed", () => {
    installStore.$isPwaInstalled.set(true);

    const wrapper = mount(InstallApp, {
      slots: {
        installed: "<span class='installed'>Bereits installiert</span>",
      },
    });

    expect(wrapper.find(".installed").exists()).toBe(true);
    expect(wrapper.find("button").isVisible()).toBe(false);
  });
});